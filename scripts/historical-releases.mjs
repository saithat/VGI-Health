/** IDs in immutable pre-rename recordings and benchmark contracts. Never use
 * this map for a current release: current v2 means the prior-auth update. */
export const historicalReleaseAliases = Object.freeze({ 'v1.1': 'v2', v2: 'v3' });
export const historicalRunIds = new Set(['run1-P3', 'run1-preflight', 'mock']);
export const historicalReleaseId = id => historicalReleaseAliases[id] ?? id;
export const releaseLabel = (id, runId) => historicalRunIds.has(runId) ? historicalReleaseId(id) : id;
export const archivedReleaseId = id => Object.entries(historicalReleaseAliases).find(([, current]) => current === id)?.[0] ?? id;
export function complexityReleaseLabels(data) {
  if (data.releaseNaming === 'integer') return data;
  return { ...data, releaseNaming: 'integer', personas: data.personas.map(person => ({ ...person,
    iterations: person.iterations.map(iteration => ({ ...iteration, specVersion: historicalReleaseId(iteration.specVersion) })),
    markers: person.markers.map(marker => marker.kind === 'release' ? { ...marker, label: historicalReleaseId(marker.label) } : marker),
  })) };
}
export function trajectoryReleaseLabels(index) {
  if (!historicalRunIds.has(index.runId) || index.releaseNaming === 'integer') return index;
  return { ...index, releaseNaming: 'integer', tasks: index.tasks.map(task => ({ ...task,
    release: historicalReleaseId(task.release),
    ...(task.baseline ? { baseline: { ...task.baseline, release: historicalReleaseId(task.baseline.release) } } : {}),
  })) };
}
// World event spellings are metadata. Keep the old spellings only when hashing
// a previous state, so a release rename cannot change clinical random draws.
export const historicalReleaseEventId = event => event.replace(/^vendor-release-(v1\.1|v2)-/, (_, id) => `vendor-release-${historicalReleaseId(id)}-`);
export const archivedReleaseEventId = event => event.replace(/^vendor-release-(v2|v3)-/, (_, id) => `vendor-release-${archivedReleaseId(id)}-`);
