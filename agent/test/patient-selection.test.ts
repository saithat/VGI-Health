import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { programSchema } from '../src/lean-types.js';
it('preserves the certified workspace selection requirement through agent parsing', () => {
  const canonical = JSON.parse(readFileSync('../releases/v1/personas/P3.json', 'utf8'));
  expect(canonical.patientSelection).toBe(true);
  expect(programSchema.parse(canonical).patientSelection).toBe(true);
});
