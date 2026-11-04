import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEhr } from '../agent/src/ehr.js';
import { programSchema, specSchema } from '../agent/src/schema.js';
import { seedPoints } from './design.js';
import { generate, describeProgram } from './generator.js';

test('the native checker accepts admitted cadence layout/density/input seeds', { skip: !process.env['EHR_BIN'] }, async () => {
  const baseline = programSchema.parse(JSON.parse(readFileSync('releases/v1/personas/P2.json','utf8')));
  const spec = specSchema.parse(JSON.parse(readFileSync('releases/v1/spec.json','utf8')));
  const ehr = createEhr({ fake: false });
  for (const point of seedPoints()) for (const density of ['normal','compact'] as const) for (const input of ['mouse','keyboard'] as const) {
    const candidate = generate({ ...point,density,input },['W3'],baseline,spec);
    assert.equal(describeProgram(candidate.program,['W3']).point.layout,point.layout);
    const verdict = await ehr.check({ specVersion: 'v1', program: candidate.program, prev: baseline, canonical: baseline });
    assert.equal(verdict,'ok',`${point.layout}/${density}/${input}: ${JSON.stringify(verdict)}`);
  }
});
