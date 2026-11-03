#!/usr/bin/env python3
"""Rebuild the vendored clinical fonts: pip install fonttools[woff]==4.68.0 Brotli==1.2.1.

Inputs are pinned upstream binaries and the reviewed Unicode repertoire; no
machine fonts or ignored patient data participate in generation.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
import urllib.request

import brotli
import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

here = Path(__file__).resolve().parent
output = here.parents[1] / 'app/src/ehr/ui/fonts'
metadata = json.loads((here / 'sources.json').read_text())
assert fontTools.__version__ == metadata['fonttools'], 'Use the pinned FontTools version'
assert brotli.__version__ == metadata['brotli'], 'Use the pinned Brotli version'
characters = {int(value, 16) for value in (here / 'repertoire.txt').read_text().split()}
sans_characters = set()
with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as scratch:
    for source, name, axes in zip(metadata['sources'],
            ['noto-sans', 'noto-sans-mono', 'noto-symbols'],
            [{'wght': (400, 800), 'wdth': 100}, {'wght': 400, 'wdth': 100}, {}]):
        data = urllib.request.urlopen(source['url']).read()
        assert hashlib.sha256(data).hexdigest() == source['sha256'], source['url']
        font = TTFont(io.BytesIO(data), recalcTimestamp=False)
        available = set(font.getBestCmap())
        selected = characters & available
        if name == 'noto-sans':
            sans_characters = available
        if name == 'noto-symbols':
            selected -= sans_characters
        if axes:
            font = instantiateVariableFont(font, axes, inplace=True)
            intermediate = Path(scratch) / 'instanced.ttf'
            font.recalcTimestamp = False
            font.save(intermediate)
            font = TTFont(intermediate, recalcTimestamp=False)
        options = subset.Options()
        options.recalc_timestamp = False
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=selected)
        sub.subset(font)
        font.flavor = 'woff2'
        font.recalcTimestamp = False
        font.save(output / (name + '.woff2'))
