// Medplum caps transactions requiring serializable isolation (conditional creates) at 8 entries.
// Preserve patient -> encounter -> note/history -> Provenance order and resolve cross-chunk links.
export function rewriteReferences(value, resolved) {
  if (Array.isArray(value)) return value.map((item) => rewriteReferences(item, resolved));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, key === 'reference' && typeof item === 'string' ? resolved.get(item) ?? item : rewriteReferences(item, resolved)]));
  return value;
}
export async function loadTransactions(client, bundle) {
  const resolved = new Map();
  let created = 0;
  const statuses = [];
  for (let offset = 0; offset < bundle.entry.length; offset += 8) {
    const entries = bundle.entry.slice(offset, offset + 8).map((entry) => ({ ...entry, resource: rewriteReferences(entry.resource, resolved) }));
    const local = new Set(entries.map((e) => e.fullUrl));
    for (const reference of JSON.stringify(entries.map((e) => e.resource)).matchAll(/"reference":"(urn:uuid:[^"]+)"/g)) {
      if (!local.has(reference[1])) throw new Error(`Forward or unresolved cross-chunk reference: ${reference[1]}`);
    }
    const response = await client.executeBatch({ ...bundle, entry: entries });
    if (response.entry?.length !== entries.length || response.entry.some((e) => !e.response?.status?.startsWith('2'))) {
      throw new Error(`Transaction chunk at ${offset} failed: ${JSON.stringify(response)}`);
    }
    for (const [i, entry] of entries.entries()) {
      const result = response.entry[i].response;
      const location = result.location?.match(/(?:^|\/)([A-Za-z]+\/[A-Za-z0-9.-]+)(?:\/_history\/[^/]+)?$/)?.[1];
      if (!location || !location.startsWith(`${entry.resource.resourceType}/`)) throw new Error(`Missing response location at ${offset + i}`);
      resolved.set(entry.fullUrl, location);
      statuses.push(result.status);
      if (result.status.startsWith('201')) created++;
    }
  }
  return { created, statuses };
}
