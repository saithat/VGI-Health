interface Entry {
  expires: number;
  pending: Promise<unknown>;
}
/** Session-local, bounded cache. Mutable manifests/indices expire after 30 seconds;
 * in-flight requests coalesce and failures can always be retried.
 */
export function createJsonCache(maxEntries = 96, now = Date.now) {
  const entries = new Map<string, Entry>();
  return (
    url: string,
    load: () => Promise<unknown>,
    ttl = 30_000,
  ): Promise<unknown> => {
    const found = entries.get(url);
    if (found && found.expires > now()) {
      entries.delete(url);
      entries.set(url, found);
      return found.pending;
    }
    const entry: Entry = { expires: Infinity, pending: Promise.resolve() };
    entry.pending = Promise.resolve().then(load);
    entries.delete(url);
    entries.set(url, entry);
    if (entries.size > maxEntries)
      entries.delete(entries.keys().next().value ?? "");
    void entry.pending.then(
      () => {
        entry.expires = now() + ttl;
      },
      () => {
        if (entries.get(url) === entry) entries.delete(url);
      },
    );
    return entry.pending;
  };
}
export const readCachedJson = createJsonCache();
