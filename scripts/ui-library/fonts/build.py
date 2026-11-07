"""Build research-only OFL subsets. Run with pinned FontTools 4.68.0/Brotli 1.2.1.
Source hashes are checked before parsing; output never touches certified assets.
Combining marks and joining scripts are excluded until shaped-run certificates exist.
"""
import hashlib, io, json, os, unicodedata, urllib.request
from pathlib import Path
import fontTools, brotli
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
assert fontTools.__version__ == '4.68.0'
assert brotli.__version__ == '1.2.1'
root = Path(__file__).resolve().parents[3]
out = root / 'app/src/browser/ui-library/fonts'
sources = [
 ('noto-world-sans', 'https://raw.githubusercontent.com/google/fonts/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf', 'bfb7bb691513f12e734dc346c03a03f784912432d7e3fa8e56efcf906fe86b3d', [(0x20,0x2ff),(0x370,0x52f),(0x1e00,0x1fff),(0x2000,0x206f),(0x2082,0x2082),(0x2c60,0x2c7f),(0xa640,0xa69f),(0xa720,0xa7ff)], {'wght':(400,800),'wdth':100}),
 ('noto-cjk', 'https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf', '2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b', [(0x3000,0x30ff),(0x4e00,0x9fff),(0xac00,0xd7a3),(0xff01,0xff60)], {}),
 ('noto-hebrew', 'https://raw.githubusercontent.com/google/fonts/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notosanshebrew/NotoSansHebrew%5Bwdth%2Cwght%5D.ttf', '7ef36a2c3593758cdb622e1bdef4f84523e92fbc3ccc667438dd80ff54c2de88', [(0x5d0,0x5ea),(0x5ef,0x5f4)], {'wght':400,'wdth':100}),
]
manifest=[]
for name,url,sha,ranges,axes in sources:
 data=urllib.request.urlopen(url).read()
 assert hashlib.sha256(data).hexdigest()==sha
 font=TTFont(io.BytesIO(data),recalcTimestamp=False)
 selected={c for c in font.getBestCmap() if any(a<=c<=b for a,b in ranges) and not unicodedata.category(chr(c)).startswith('M') and unicodedata.category(chr(c))!='Cf'}
 if axes:
  font=instantiateVariableFont(font,axes,inplace=True)
  intermediate=io.BytesIO(); font.save(intermediate); intermediate.seek(0)
  font=TTFont(intermediate,recalcTimestamp=False)
 options=subset.Options(); options.recalc_timestamp=False; options.layout_features=[]
 sub=subset.Subsetter(options=options); sub.populate(unicodes=selected); sub.subset(font)
 font.flavor='woff2'; font.recalcTimestamp=False
 instances=[(f'{name}-{weight}',instantiateVariableFont(font,{'wght':weight},inplace=False)) for weight in [400,600,650,700,750,800]] if name=='noto-world-sans' else [(name,font)]
 for instance_name,instance in instances:
  path=out/(instance_name+'.woff2'); instance.flavor='woff2'; instance.recalcTimestamp=False; instance.save(path)
  manifest.append(dict(name=instance_name,url=url,sourceSha256=sha,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),bytes=path.stat().st_size,glyphs=len(instance.getBestCmap()),ranges=ranges))
(out/'sources.json').write_text(json.dumps(dict(fonttools=fontTools.__version__,brotli=brotli.__version__,sources=manifest),indent=2)+'\n')
print(json.dumps(manifest,indent=2))
