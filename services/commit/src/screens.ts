import type { Command } from './types.ts';
export interface Frame { step: number; phase: 'ready' | 'loading'; hash: string }
/** Every reconstructed ready position is mandatory; loading frames are optional
 * because React may batch them away. Every supplied frame must match, in order.
 * The request payload digest binds the full evidence to the durable intent. */
export function verifyScreens(command: Command, native: Frame[]) {
  const browser = command.screens;
  const mismatch = (step: number, nativeHash: string | null, browserHash: string | null) => ({ step, nativeHash, browserHash });
  if (!browser || browser.requestId !== command.requestId)
    return mismatch(native[0]?.step ?? 0, native[0]?.hash ?? null, null);
  let cursor = 0;
  for (const actual of browser.frames) {
    while (cursor < native.length && native[cursor].phase === 'loading' &&
      (native[cursor].step !== actual.step || actual.phase !== 'loading')) cursor++;
    const expected = native[cursor];
    if (!expected || expected.step !== actual.step || expected.phase !== actual.phase || expected.hash !== actual.hash)
      return mismatch(actual.step, expected?.hash ?? null, actual.hash);
    cursor++;
  }
  while (cursor < native.length && native[cursor].phase === 'loading') cursor++;
  if (cursor !== native.length) return mismatch(native[cursor].step, native[cursor].hash, null);
  return undefined;
}
