# Explainer video

A 6-minute narrated overview of how the system works, made with
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
files. For a voice track, generate audio first and render again; each beat then
lasts at least as long as its audio:

```sh
.venv/bin/python docs/explainer/voice.py --engine piper --model en_US-lessac-medium.onnx
.venv/bin/python docs/explainer/voice.py --engine espeak-ng   # no download, robotic
```

The rendered video and audio are not committed.
