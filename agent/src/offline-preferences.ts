import { personaParams } from '../../world/src/personas.js';
import { sha256 } from './program.js';
import type { PersonaParams } from './schema.js';

/** Predeclared simulation assumption, not measured clinician preferences.
 * Task roles distinguish the two physician workflows. Both prefer allergy context
 * beside medication dose entry. Unit weights and disruption sensitivity are 1..3;
 * the native ordinal travel/rating functions remain unchanged.
 */
export const OFFLINE_PREFERENCE_ASSUMPTION = 'workflow-local-review-v1';
export const offlineRoleProfiles = {
  P1: {role:'primary-care-prescriber', screen:'w1Orders'},
  P2: {role:'emergency-prescriber', screen:'w3Orders'},
} as const;
export function offlinePersonaParams(id: keyof typeof offlineRoleProfiles, seed: number): PersonaParams {
  const role = offlineRoleProfiles[id];
  const draw = Number.parseInt(sha256(`${OFFLINE_PREFERENCE_ASSUMPTION}:${seed}:${role.role}`).slice(0,8),16);
  return {...personaParams(id, seed, 'bounded'), hiddenPreferences:{
    placements:[{tag:`${role.screen}.patientSidebar.allergyList`,nearTag:`${role.screen}.dose`,weight:1 + draw % 3}],
    changeSensitivity:1 + Math.floor(draw / 3) % 3,
  }};
}
