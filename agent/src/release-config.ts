/** Release identities and calendar have one repository-owned configuration. */
import config from '../../world/releases.json';
export const RELEASE_IDS = config.ids;
export const LEGACY_RELEASE_IDS = config.legacyIds;
export const RELEASE_MODULES = config.leanModules;
export const RELEASE_DAYS = { v1_1: config.v1_1, v2: config.v2 };
export const releaseModule = (id: string): string | undefined => {
  for (const key of ['base', 'feature', 'migration'] as const) if (RELEASE_IDS[key] === id) return RELEASE_MODULES[key];
  return undefined;
};
