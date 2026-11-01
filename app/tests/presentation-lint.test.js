import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const eslint = new ESLint();
const safe = readFileSync('src/ehr/ui/custom/example/v0/Review.tsx', 'utf8');
const filePath = 'src/ehr/ui/custom/example/v0/Review.tsx';
describe('versioned presentation lint sandbox', () => {
  it('accepts the declarative component used by the typecheck harness', async () => {
    const results = await eslint.lintText(safe, { filePath });
    expect(results.flatMap((r) => r.messages)).toEqual([]);
  });
  it.each([
    'fetch("/fhir")', 'new XMLHttpRequest()', 'new WebSocket("wss://x")',
    'window.document.body.remove()', 'globalThis["localStorage"].clear()',
    'setTimeout(() => {}, 1)', 'onEvent({click:{comp:"invented"}})',
  ])('rejects %s', async (attack) => {
    const results = await eslint.lintText(safe.replace('return <Paper', `${attack}; return <Paper`), { filePath });
    expect(results.flatMap((r) => r.messages).some((m) => m.ruleId === 'boundary/presentation')).toBe(true);
  });
});
