import type { Obj } from './types.ts';

/** Lossless journal exchange, not a claim to implement every clinical mapper.
 * Imported resources remain intact; W4 appends native reducer-produced administrations. Accepted commands use
 * an explicit VGI Basic profile; projecting them to clinical R4 resources is a
 * separate, versioned consumer for other workflows of the authoritative Postgres history. */
export function exportFhir(patient: string, snapshot: Obj, events: Obj[]) {
  return {
    resourceType: 'Bundle', type: 'collection',
    identifier: { system: 'urn:vgi:patient-stream', value: `${patient}@${snapshot.version}` },
    entry: [
      ...snapshot.snapshot.bundle.entry,
      ...events.filter(e => e.event.kind === 'command').map(e => ({ resource: {
        resourceType: 'Basic', id: e.transactionId, meta: { versionId: String(e.version), profile: ['urn:vgi:profile:accepted-command'] },
        code: { coding: [{ system: 'urn:vgi:command', code: e.event.guard.input.commit }] },
        subject: { reference: `Patient/${patient}` },
        extension: [{ url: 'urn:vgi:accepted-command', valueString: JSON.stringify(e) }],
      } })),
    ],
  };
}
