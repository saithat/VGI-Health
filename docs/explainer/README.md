# Explainer video

A 4½-minute animated overview of how the system works, made with
[Manim Community](https://www.manim.community/) 0.22. Scenes: the problem, the
day and night loop, programs as data, one night's change, the Lean gate,
inside one click, what is proved, and where people come in.

```sh
python -m venv .venv && .venv/bin/pip install manim==0.22.1   # needs pango-devel and cairo-devel
.venv/bin/python docs/explainer/render.py                    # 1080p60 → docs/explainer/media/
.venv/bin/python docs/explainer/render.py --quality l        # quick 480p preview
```

The rendered video is not committed.
