#!/usr/bin/env python3
"""Real interpreter build. Only generated initialization plumbing is patched."""
import argparse
import concurrent.futures as futures
import difflib
import json
from pathlib import Path
import re
import time
import build as b

PROJECT = b.ROOT / "lean"
IR = PROJECT / ".lake/build/ir"


def init_name(code):
    names = re.findall(r"LEAN_EXPORT lean_object\* ((?:runtime_)?initialize_\w+)\(uint8_t builtin\) \{", code)
    if len(names) != 1:
        raise RuntimeError(f"Expected one module initializer: {names}")
    return names[0]


def patch_project(path):
    original = path.read_text()
    name = init_name(original)
    marker = f"LEAN_EXPORT lean_object* {name}(uint8_t builtin) {{"
    before, body = original.split(marker)
    # Lean 4.35's combined project initializer calls full Lean initialization.
    # Retain ALL generated constant initialization, only redirect the prologue
    # and stdlib imports to the runtime half of their split initializers.
    if body.count("\nlean_initialize();") > 1:
        raise RuntimeError(f"Unexpected initializer in {path}")
    body = body.replace("\nlean_initialize();", "\nlean_initialize_runtime_module();")
    before = before.replace("void lean_initialize();", "void lean_initialize_runtime_module();")
    patched = before + marker + body
    patched = re.sub(r"\binitialize_((?:Init|Lean|Std)(?:_\w+)?)\(", r"runtime_initialize_\1(", patched)
    if "lean_initialize();" in patched:
        raise RuntimeError(f"Full Lean initializer survived in {path}")
    out = b.BUILD / "ehr-c" / path.relative_to(IR)
    b.write_changed(out, patched)
    b.write_changed(out.with_suffix(".patch"), "".join(difflib.unified_diff(
        original.splitlines(True), patched.splitlines(True), fromfile=str(path.relative_to(PROJECT)),
        tofile=str(out.relative_to(b.ROOT)))))
    return out, name


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-module", action="append", help="Additional API root (repeatable)")
    args = parser.parse_args()
    started = time.monotonic()
    # Future Render/FHIR API modules are roots automatically, even if the main
    # API has not yet imported them. Runtime dependencies come from emitted C.
    roots = {"Ehr.Api", *(args.api_module or [])}
    for path in (PROJECT / "Ehr").rglob("*.lean"):
        if re.search(r"@\[export ehr_\w+\]", path.read_text()):
            roots.add(".".join(path.relative_to(PROJECT).with_suffix("").parts))
    print(f"[API roots] {', '.join(sorted(roots))}", flush=True)
    b.run(["lake", "build", *[f"{name}:c" for name in sorted(roots)]], cwd=PROJECT)
    for directory in [b.BUILD / "obj", b.WASM / "dist"]:
        directory.mkdir(parents=True, exist_ok=True)
    # Reuse the spike's exact pinned runtime validation and ABI header patches.
    for repo, commit in [("lean4", "eb6cafb7290e8bd5f2937522d8d804f58f02bafc"),
                         ("libuv", "1cfa32ff59c076ffb6ed735bbc8c18361558661f")]:
        directory = b.ROOT / ".tools" / repo
        if b.run(["git", "-C", directory, "rev-parse", "HEAD"]).strip() != commit:
            raise RuntimeError(f"Wrong pinned {repo} checkout")
        b.run(["git", "-C", directory, "diff", "--exit-code", "--", "src" if repo == "lean4" else "include"])
    b.prepare_headers()
    project_map = {}
    for path in IR.rglob("*.c"):
        project_map[init_name(path.read_text())] = path
    std_map = {"runtime_initialize_" + str(p.relative_to(b.STDLIB).with_suffix("")).replace("/", "_"): p
               for p in b.STDLIB.rglob("*.lean")}
    root_names = [init_name((IR / (root.replace(".", "/") + ".c")).read_text()) for root in sorted(roots)]
    pending = set(root_names)
    outputs, modules = [], {}
    exports = set()
    with futures.ThreadPoolExecutor(max_workers=b.JOBS) as pool:
        while pending:
            batch, pending = sorted(pending), set()
            tasks = {}
            for name in batch:
                if name in project_map:
                    tasks[pool.submit(patch_project, project_map[name])] = (name, True)
                elif name in std_map:
                    tasks[pool.submit(b.generate_c, std_map[name], b.STDLIB)] = (name, False)
                else:
                    raise RuntimeError(f"No source for runtime dependency {name}")
            for task in futures.as_completed(tasks):
                name, project = tasks[task]
                result = task.result()
                path = result[0] if project else result
                code = path.read_text()
                if project:
                    # Only single-string exports fit this bridge; multi-argument
                    # forms stay available in Lean, but the app uses envelopes.
                    exports.update(re.findall(r"LEAN_EXPORT lean_object\* (ehr_\w+)\(lean_object\* \w+\)\s*\{", code))
                    body = code.split(f"LEAN_EXPORT lean_object* {name}(uint8_t builtin) {{")[1]
                else:
                    body = b.initializer_body(code, name.removeprefix("runtime_initialize_"))
                outputs.append(path)
                modules[name] = str(path.relative_to(b.ROOT))
                pending.update(dep for dep in re.findall(r"\b((?:runtime_)?initialize_\w+)\(builtin\)", body)
                               if dep not in modules and dep not in batch)
            print(f"[Lean C] {len(modules)} modules; {len(pending)} queued", flush=True)
        objects = list(pool.map(b.compile_object, sorted(outputs)))
        objects += list(pool.map(b.compile_object, b.runtime_sources()))
    required = {"ehr_init_envelope", "ehr_step_envelope", "ehr_view_envelope"}
    if not required <= exports:
        raise RuntimeError(f"Missing envelope exports: {required - exports}")
    template = (b.WASM / "interp-bridge.cpp").read_text()
    declarations = "\n".join(f"lean_object * {name}(lean_object *);" for name in sorted(exports))
    dispatch = "\n".join(f'    if (std::strcmp(name, "{name}") == 0) fn = {name};' for name in sorted(exports))
    initializers = "\n".join(f"lean_object * {name}(uint8_t);" for name in root_names)
    initialize = "\n".join(f"    result = {name}(1);\n    if (lean_io_result_is_error(result)) {{ lean_dec(result); return 1; }}\n    lean_dec(result);" for name in root_names)
    bridge = b.BUILD / "interp-bridge.cpp"
    b.write_changed(bridge, template.replace("// DECLARATIONS", declarations + "\n" + initializers)
                    .replace("// INITIALIZERS", initialize).replace("// DISPATCH", dispatch))
    objects.append(b.compile_object(bridge))
    output = b.WASM / "dist/ehr-interp.mjs"
    b.run(["em++", *b.COMMON, "-std=c++20", *objects, "--no-entry", "-sMODULARIZE=1", "-sEXPORT_ES6=1",
           "-sENVIRONMENT=web,node", "-sALLOW_MEMORY_GROWTH=1", "-sINITIAL_MEMORY=33554432", "-sSTACK_SIZE=8388608",
           "-sEXPORTED_FUNCTIONS=['_ehr_initialize','_ehr_call_string','_ehr_free_string','_ehr_heap_used','_malloc','_free']",
           "-sEXPORTED_RUNTIME_METHODS=['ccall','UTF8ToString','stringToUTF8','lengthBytesUTF8']",
           "-sERROR_ON_UNDEFINED_SYMBOLS=1", "-o", output])
    for filename in ["interp-loader.mjs", "interp-loader.d.mts"]:
        content = (b.WASM / filename).read_text()
        if filename == "interp-loader.mjs":
            content = content.replace("/* EXPORTS */ []", json.dumps(sorted(exports)))
        b.write_changed(b.WASM / "dist" / filename, content)
    summary = {"roots": sorted(roots), "modules": modules, "exports": sorted(exports),
               "wasmBytes": output.with_suffix(".wasm").stat().st_size,
               "elapsedSeconds": time.monotonic() - started}
    (b.BUILD / "ehr-build.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({k: v for k, v in summary.items() if k != "modules"}, indent=2), flush=True)


if __name__ == "__main__":
    main()
