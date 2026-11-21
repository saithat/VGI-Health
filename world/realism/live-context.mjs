// The versioned contexts belong to the release's world 2 schedules.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const liveContextPath = 'fixtures/live-context/world-2/v2';

export function contextDirectory(root, world) {
  const live = resolve(root, liveContextPath);
  if (world === resolve(root, 'runs/world/2') && existsSync(live)) return live;
  return resolve(world, 'context');
}
