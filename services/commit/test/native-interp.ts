import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
type Context = [spec: string, program: string, facts: string, user: string];

/** Test-only native implementation of the browser's synchronous interpreter
 * seam. It exercises current Lean without rebuilding the packaged WASM. */
export function nativeCall(op: string, input: unknown): unknown {
  const result = spawnSync(process.env.EHR_BIN ?? fileURLToPath(new URL('../../../lean/.lake/build/bin/ehr', import.meta.url)), ['serve'], {
    input: JSON.stringify({ id: 1, op, input }) + '\n', encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || `native exit ${result.status}`);
  const response = JSON.parse(result.stdout);
  if (response.error) throw new Error(response.error);
  return response.result;
}
export function nativeInterp() {
  const call = (op: string, spec: string, program: string, projection: string, user: string, state?: string, event?: string) => {
    const projected = JSON.parse(projection);
    return JSON.stringify(nativeCall(op, { spec: JSON.parse(spec), program: JSON.parse(program),
      facts: projected.facts ?? projected, display: projected.display ?? {}, user: JSON.parse(user),
      ...(state ? { state: JSON.parse(state) } : {}), ...(event ? { event: JSON.parse(event) } : {}) }));
  };
  return { init: (...args: Context) => call('init', ...args), step: (...args: [...Context, string, string]) => call('step', ...args),
    view: (...args: [...Context, string]) => call('view', ...args), render: () => '{}', renderUi: (...args: [...Context, string]) => call('render-ui', ...args),
    facts: (input: string) => JSON.stringify(nativeCall('facts', JSON.parse(input))),
    screenCanonical: (input: string) => JSON.stringify(nativeCall('screen-canonical', JSON.parse(input))) };
}
