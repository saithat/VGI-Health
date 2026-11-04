/** Run-scoped memoization for an immutable offline world/build/assertion context.
 * Like the geometry cache, never reuse this wrapper after changing that context.
 * New program/workspace inputs still run the complete real screen gate.
 */
import type { ScreenChecker } from './screencheck.js';
import { stableStringify } from './program.js';

export function immutableScreenChecks(inner: ScreenChecker): ScreenChecker {
  const cache=new Map<string,ReturnType<ScreenChecker['check']>>();
  const geometry=inner.geometry?.bind(inner);
  return {mode:inner.mode,
    ...(geometry ? {geometry} : {}),
    async check(input) {
      const key=stableStringify(input);
      let pending=cache.get(key);
      if(!pending) {
        pending=inner.check(structuredClone(input));
        cache.set(key,pending);
        void pending.then(result=>{if(result.status==='error')cache.delete(key);},()=>{cache.delete(key);});
      }
      return structuredClone(await pending);
    }};
}
