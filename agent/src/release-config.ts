/** The repository calendar is the authoritative current release-id configuration. */
import config from '../../world/releases.json';
export const RELEASE_IDS = { base: 'v1', feature: 'v2', migration: 'v3' };
export const LEGACY_RELEASE_IDS = { base: 'v1', feature: 'v1.1', migration: 'v2' };
export const RELEASE_MODULES = { base: 'V1', feature: 'V2', migration: 'V3' };
export const RELEASE_DAYS = config;
export const releaseModule = (id: string): string | undefined => {
  for (const key of ['base', 'feature', 'migration'] as const) if (RELEASE_IDS[key] === id) return RELEASE_MODULES[key];
  return undefined;
};
