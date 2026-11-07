import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { template } from './cases.mjs';
import { multiscript } from './multiscript.mjs';
test('all served research font bytes match the pinned source manifest',()=>{
  const root=new URL('../../app/src/browser/ui-library/fonts/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('sources.json',root),'utf8'));
  let total=0;
  for(const font of manifest.sources) {
    const bytes=readFileSync(new URL(font.name+'.woff2',root));
    assert.equal(bytes.length,font.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),font.sha256);
    total+=bytes.length;
  }
  assert.equal(total,5790948);
});
test('multi-script safety values use real supported glyphs and explicit shaping escapes',()=>{
  for(const [script,text] of multiscript) {
    const request=template();request.content[0][1]=text;
    const p=spawnSync('lean/.lake/build/bin/ui-layout',[],{input:JSON.stringify(request)+'\n',encoding:'utf8'});
    assert.equal(p.status,0,p.stderr);
    const result=JSON.parse(p.stdout);assert.equal(result.accepted,true,script);
    const banner=result.boxes.find(d=>d.box.info.banner);
    assert.equal(banner.original,text);
    if(script.endsWith('escaped')) assert.match(banner.lines.join(''),/\[U\+[0-9A-F]{6}\]/);
    else assert.equal(banner.lines.join(''),text,script);
  }
});
