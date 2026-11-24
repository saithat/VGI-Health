"""Render every explainer scene with Manim Community and join them into one video."""
import argparse
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from explainer import SCENES  # noqa: E402

FOLDER = {"l": "480p15", "m": "720p30", "h": "1080p60", "p": "1440p60", "k": "2160p60"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quality", default="h", choices=FOLDER)
    ap.add_argument("--out", default=str(HERE / "media" / "vgi-health-explainer.mp4"))
    args = ap.parse_args()
    media = HERE / "media"
    for scene in SCENES:
        subprocess.run([sys.executable, "-m", "manim", "render", f"-q{args.quality}",
                        "--media_dir", str(media), "--disable_caching",
                        str(HERE / "explainer.py"), scene], check=True)
    parts = media / "videos" / "explainer" / FOLDER[args.quality]
    listing = media / f"scenes-{args.quality}.txt"
    listing.write_text("".join(f"file '{parts / (s + '.mp4')}'\n" for s in SCENES))
    joined = media / f"joined-{args.quality}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", str(listing), "-c", "copy", str(joined)], check=True)
    out = Path(args.out)
    srt, vtt = join_captions(parts), out.with_suffix(".vtt")
    out.with_suffix(".srt").write_text(srt)
    vtt.write_text("WEBVTT\n\n" + re.sub(r"(\d\d:\d\d:\d\d),(\d\d\d)", r"\1.\2", srt))
    # Captions ride along as a soft track; players can turn them on and off.
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(joined), "-i", str(out.with_suffix(".srt")),
                    "-map", "0", "-map", "1", "-c", "copy", "-c:s", "mov_text",
                    "-metadata:s:s:0", "language=eng", str(out)], check=True)
    print(out, vtt, sep="\n")


def seconds(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                        str(path)], capture_output=True, text=True, check=True)
    return float(r.stdout)


def stamp(t: float) -> str:
    ms = round(t * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def join_captions(parts: Path) -> str:
    """Shift each scene's subcaptions by the length of the scenes before it."""
    cues, offset = [], 0.0
    for scene in SCENES:
        srt = parts / f"{scene}.srt"
        if srt.exists():
            for block in srt.read_text().strip().split("\n\n"):
                lines = block.splitlines()
                a, b = [sum(float(x) * m for x, m in zip(t.replace(",", ".").split(":"), (3600, 60, 1)))
                        for t in lines[1].split(" --> ")]
                cues.append((offset + a, offset + b, " ".join(lines[2:])))
        offset += seconds(parts / f"{scene}.mp4")
    return "".join(f"{i}\n{stamp(a)} --> {stamp(b)}\n{text}\n\n" for i, (a, b, text) in enumerate(cues, 1))


if __name__ == "__main__":
    main()
