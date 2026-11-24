"""Generate the narration audio for every self.say(...) line in explainer.py.

    python docs/explainer/voice.py --engine piper --model path/to/voice.onnx
    python docs/explainer/voice.py --engine espeak-ng    # robotic, but needs no download

Files land in media/voice/<hash>.wav; explainer.py picks them up on the next render.
Lines whose audio already exists are skipped, so edit a line and rerun.
"""
import argparse
import ast
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from explainer import VOICE, voice_file  # noqa: E402


def narration():
    tree = ast.parse((HERE / "explainer.py").read_text())
    for node in ast.walk(tree):
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == "say" and node.args and isinstance(node.args[0], ast.Constant)):
            yield node.args[0].value


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["piper", "espeak-ng"], default="piper")
    ap.add_argument("--model", help="piper voice (.onnx)")
    args = ap.parse_args()
    VOICE.mkdir(parents=True, exist_ok=True)
    lines = list(dict.fromkeys(narration()))
    for i, text in enumerate(lines, 1):
        if voice_file(text):
            continue
        import hashlib
        out = VOICE / (hashlib.sha1(text.encode()).hexdigest()[:16] + ".wav")
        if args.engine == "piper":
            if not args.model:
                sys.exit("--model is required for piper")
            subprocess.run([sys.executable, "-m", "piper", "--model", args.model,
                            "--sentence-silence", "0.25", "--output-file", str(out)],
                           input=text.encode(), check=True)
        else:
            subprocess.run(["espeak-ng", "-v", "en-us", "-s", "165", "-w", str(out), text], check=True)
        print(f"{i}/{len(lines)} {out.name}")
    print(f"{len(lines)} lines voiced in {VOICE}")


if __name__ == "__main__":
    main()
