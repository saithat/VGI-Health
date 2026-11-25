# Explainer video

A 6-minute captioned overview of how the system works, made with
[Manim Community](https://www.manim.community/) 0.22. Scenes: the problem, the
day and night loop, programs as data, one night's change, the Lean gate,
inside one click, what is proved, and where people come in.

```sh
python -m venv .venv && .venv/bin/pip install manim==0.22.1   # needs pango-devel and cairo-devel
.venv/bin/python docs/explainer/render.py                    # 1080p60 → docs/explainer/media/
.venv/bin/python docs/explainer/render.py --quality l        # quick 480p preview
```

Each beat's narration is a `self.say(...)` line in `explainer.py`. The render
writes it as captions: a soft subtitle track in the MP4, plus `.srt` and `.vtt`
files. The video has no voice track.

The rendered video is not committed.
