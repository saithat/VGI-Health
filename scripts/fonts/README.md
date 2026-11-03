# Clinical webfonts

The app ships Noto Sans, Noto Sans Mono and a two-glyph Noto Sans Symbols 2
fallback (`◷`, `✓`). Upstream binaries are pinned by revision and SHA-256 in
`sources.json`; OFL-1.1 licenses ship beside the generated WOFF2 assets in
`app/src/ehr/ui/fonts/`. CSS uses private family aliases and never `local()`.
Noto Sans provides the current clinical sans metrics. Mono is regular 400;
sans is normal variable 400–800, retaining the painter's intermediate 650/750
weights. There are no italic files or unused language subsets.

`repertoire.txt` contains Latin-1 printable characters plus characters used by
the painter, tracked UI fixtures and the 15 current persona canonical exports.
The symbol fallback supplies the two UI symbols absent from Noto Sans. New
languages or symbols require explicit repertoire review and fresh capture
verification; these assets do not claim universal Unicode coverage.

Rebuild from the repository root with disk-backed scratch:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
python3 -m venv "$TMPDIR/clinical-fonts"
"$TMPDIR/clinical-fonts/bin/pip" install 'fonttools[woff]==4.68.0' 'Brotli==1.2.1'
"$TMPDIR/clinical-fonts/bin/python" scripts/fonts/build.py
pnpm --filter app build
pnpm --filter app test:geometry-determinism
```

Generation sets the width axis to 100, removes unneeded glyphs/weights, emits
WOFF2 and preserves upstream timestamps so regeneration is byte-stable. It
never reads the host's installed fonts. Font bytes enter both the certified
application fingerprint and geometry cache context.
