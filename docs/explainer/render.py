"""Render every explainer scene with Manim Community and join them into one video."""
import argparse
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
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", str(listing), "-c", "copy", args.out], check=True)
    print(args.out)


if __name__ == "__main__":
    main()
