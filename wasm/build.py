#!/usr/bin/env python3
"""Build exact Lean 4.35 C and its runtime; never link host objects or stage0 C."""
import argparse
import concurrent.futures as futures
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parent.parent
WASM = ROOT / "wasm"
BUILD = WASM / ".build"
LEAN_SRC = ROOT / ".tools/lean4/src"
PREFIX = Path(subprocess.check_output(["lean", "--print-prefix"], text=True).strip())
STDLIB = PREFIX / "src/lean"
JOBS = int(os.environ.get("JOBS", "8"))


def run(args, cwd=ROOT):
    result = subprocess.run([str(a) for a in args], cwd=cwd, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if result.returncode:
        display = list(map(str, args))
        if len(display) > 45:
            display = display[:15] + [f"... ({len(args)} arguments)"] + display[-8:]
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(display)}\n{result.stdout}")
    return result.stdout


def write_changed(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text() != content:
        path.write_text(content)


def prepare_headers():
    write_changed(BUILD / "include/lean/config.h", "#pragma once\n#include <lean/version.h>\n#define LEAN_IS_STAGE0 0\n")
    version = (PREFIX / "include/lean/version.h").read_text()
    version = re.sub(r'#define LEAN_PLATFORM_TARGET .*', '#define LEAN_PLATFORM_TARGET "wasm32-unknown-emscripten"', version)
    write_changed(BUILD / "include/lean/version.h", version)
    write_changed(BUILD / "include/githash.h", '#define LEAN_GITHASH "eb6cafb7290e8bd5f2937522d8d804f58f02bafc"\n')


COMMON = ["-O2", "-DNDEBUG", "-DLEAN_EMSCRIPTEN", "-DLEAN_EXPORTING", "-fwasm-exceptions",
          "-ffunction-sections", "-fdata-sections", "-I" + str(BUILD / "include"),
          "-I" + str(LEAN_SRC / "include"), "-I" + str(LEAN_SRC),
          "-I" + str(ROOT / ".tools/libuv/include")]


def compile_object(source):
    source = Path(source)
    key = hashlib.sha256(str(source).encode()).hexdigest()[:12]
    obj = BUILD / "obj" / f"{source.stem}-{key}.o"
    compiler = "em++" if source.suffix == ".cpp" else "emcc"
    cmd = [compiler, *COMMON]
    if compiler == "em++":
        cmd += ["-std=c++20"]
    cmd += ["-c", source, "-o", obj]
    stamp = obj.with_suffix(".json")
    signature = json.dumps([list(map(str, cmd)), source.stat().st_mtime_ns,
                            (BUILD / "include/lean/config.h").stat().st_mtime_ns,
                            (BUILD / "include/lean/version.h").stat().st_mtime_ns])
    if not obj.exists() or not stamp.exists() or stamp.read_text() != signature:
        run(cmd)
        stamp.write_text(signature)
    return obj


def runtime_sources():
    cmake = (LEAN_SRC / "runtime/CMakeLists.txt").read_text()
    block = re.search(r"set\(\s+RUNTIME_OBJS\s+(.*?)\n\)", cmake, re.S).group(1)
    sources = [LEAN_SRC / "runtime" / name for name in block.split()]
    # v4.35's unused Emscripten group lookup stub omits the header's argument.
    # Patch a build-local copy, preserving the pinned checkout and exact diff.
    original = LEAN_SRC / "runtime/uv/system.cpp"
    text = original.read_text()
    old = 'lean_uv_os_get_group() {'
    if text.count(old) != 1:
        raise RuntimeError("Unexpected Lean libuv stub; review system.cpp patch")
    patched = BUILD / "patched/system.cpp"
    write_changed(patched, text.replace(old, 'lean_uv_os_get_group(uint64_t gid) {'))
    sources = [patched if p == original else p for p in sources]
    # The compiler erases IO's world token in v4.35; these two old runtime
    # definitions still take it. Correct the ABI even though they are stripped.
    original_io = LEAN_SRC / "runtime/io.cpp"
    io_text = original_io.read_text()
    for name in ["lean_io_create_tempfile", "lean_io_create_tempdir"]:
        old = name + "(lean_object * /* w */)"
        if io_text.count(old) != 1:
            raise RuntimeError(f"Unexpected runtime IO ABI for {name}")
        io_text = io_text.replace(old, name + "()")
    patched_io = BUILD / "patched/io.cpp"
    write_changed(patched_io, io_text)
    return [patched_io if p == original_io else p for p in sources] + [WASM / "uv-error.c"]


def initializer_body(code, name):
    marker = f"LEAN_EXPORT lean_object* runtime_initialize_{name}(uint8_t builtin) {{"
    start = code.find(marker)
    if start < 0:
        raise RuntimeError(f"No runtime initializer for {name}; use Lean 4.35 module files")
    start += len(marker)
    depth, end = 1, start
    while depth:
        if code[end] == "{":
            depth += 1
        elif code[end] == "}":
            depth -= 1
        end += 1
    body = code[start:end - 1]
    if "lean_initialize();" in body:
        raise RuntimeError(f"{name} calls the full Lean initializer. See wasm-spike.md module naming constraint.")
    return body


def generate_c(source, root):
    relative = source.relative_to(root)
    out = BUILD / "c" / relative.with_suffix(".c")
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists() or source.stat().st_mtime_ns > out.stat().st_mtime_ns:
        temp = out.with_suffix(".tmp.c")
        run(["lean", "-j1", "-R", root, "-c", temp, source], cwd=root)
        temp.replace(out)
    return out


def closure(source):
    # Follow the actual emitted runtime initializer calls, excluding metadata-only
    # imports. All C is still emitted unchanged by the pinned host compiler.
    modules = {str(p.relative_to(STDLIB).with_suffix("")).replace("/", "_"): p
               for p in STDLIB.rglob("*.lean")}
    root_name = str(source.relative_to(WASM).with_suffix("")).replace("/", "_")
    pending = {root_name: (source, WASM)}
    seen, outputs = set(), []
    with futures.ThreadPoolExecutor(max_workers=JOBS) as pool:
        while pending:
            batch = pending
            pending = {}
            tasks = {pool.submit(generate_c, path, root): name for name, (path, root) in batch.items()}
            for task in futures.as_completed(tasks):
                name = tasks[task]
                out = task.result()
                outputs.append(out)
                seen.add(name)
                body = initializer_body(out.read_text(), name)
                for dep in re.findall(r"\bruntime_initialize_(\w+)\(builtin\)", body):
                    if dep not in seen and dep not in batch:
                        if dep not in modules:
                            raise RuntimeError(f"Cannot find runtime module source: {dep}")
                        pending[dep] = (modules[dep], STDLIB)
            print(f"[Lean C] {len(seen)} modules generated; {len(pending)} queued", flush=True)
    return sorted(outputs), sorted(seen), root_name


def build(variant, runtime_objects):
    source = WASM / "Lean" / ("WasmSpike.lean" if variant == "json" else "WasmInitOnly.lean")
    c_files, modules, root_name = closure(source)
    manifest = BUILD / f"{variant}-modules.json"
    manifest.write_text(json.dumps(modules, indent=2) + "\n")
    print(f"[emcc] {variant}: compiling {len(c_files)} Lean C modules", flush=True)
    with futures.ThreadPoolExecutor(max_workers=JOBS) as pool:
        objects = list(pool.map(compile_object, c_files))
    bridge = BUILD / f"{variant}-bridge.cpp"
    bridge_text = (WASM / "bridge.cpp").read_text().replace("EHR_MODULE_INIT", "runtime_initialize_" + root_name)
    write_changed(bridge, bridge_text)
    objects += [compile_object(bridge), *runtime_objects]
    output = WASM / "dist" / ("ehr.mjs" if variant == "json" else "ehr-init.mjs")
    run(["em++", *COMMON, "-std=c++20", *objects, "--no-entry", "-sMODULARIZE=1", "-sEXPORT_ES6=1",
         "-sENVIRONMENT=web,node", "-sALLOW_MEMORY_GROWTH=1", "-sINITIAL_MEMORY=33554432", "-sSTACK_SIZE=8388608",
         "-sEXPORTED_FUNCTIONS=['_ehr_initialize','_ehr_step_string','_ehr_free_string','_ehr_heap_used','_malloc','_free']",
         "-sEXPORTED_RUNTIME_METHODS=['ccall','UTF8ToString','stringToUTF8','lengthBytesUTF8']",
         "-sERROR_ON_UNDEFINED_SYMBOLS=1", "-o", output])
    print(f"[done] {output.relative_to(ROOT)}: {output.with_suffix('.wasm').stat().st_size:,} WASM bytes", flush=True)
    return {"variant": variant, "modules": len(modules), "wasmBytes": output.with_suffix('.wasm').stat().st_size}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--variant", choices=["json", "init", "both"], default="both")
    args = parser.parse_args()
    started = time.monotonic()
    for path in [BUILD / "obj", WASM / "dist"]:
        path.mkdir(parents=True, exist_ok=True)
    if run(["git", "-C", ROOT / ".tools/lean4", "rev-parse", "HEAD"]).strip() != "eb6cafb7290e8bd5f2937522d8d804f58f02bafc":
        raise RuntimeError("Lean runtime checkout does not match installed compiler")
    prepare_headers()
    print(f"[runtime] {len(runtime_sources())} sources, {JOBS} jobs, wasm32 / no GMP / no threads", flush=True)
    with futures.ThreadPoolExecutor(max_workers=JOBS) as pool:
        runtime_objects = list(pool.map(compile_object, runtime_sources()))
    variants = ["init", "json"] if args.variant == "both" else [args.variant]
    results = [build(variant, runtime_objects) for variant in variants]
    shutil.copyfile(WASM / "ehr.js", WASM / "dist/ehr.js")
    summary = {"lean": "4.35.0", "emscripten": run(["emcc", "--version"]).splitlines()[0],
               "elapsedSeconds": time.monotonic() - started, "results": results}
    (BUILD / "build-result.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
