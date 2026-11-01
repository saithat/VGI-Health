/** The repository calendar is the authoritative current release-id configuration. */
import config from '../../world/releases.json';
import {RELEASE_IDS,RELEASE_MODULES} from '../../scripts/release-config.mjs';
export {RELEASE_IDS,RELEASE_MODULES};
export const LEGACY_RELEASE_IDS = { base: 'v1', feature: 'v1.1', migration: 'v2' };

export const RELEASE_DAYS = config;
export const releaseModule = (id: string): string | undefined => {
  for (const key of ['base', 'feature', 'migration'] as const) if (RELEASE_IDS[key] === id) return RELEASE_MODULES[key];
  return undefined;
};
