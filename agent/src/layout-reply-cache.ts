import { gzipSync, gunzipSync } from "node:zlib";
import type { LayoutReply, LayoutRunner } from "./lean-layout-native.js";
import { sha256 } from "./program.js";

/** Retain only compressed, immutable JSON evidence within a fixed byte budget. */
export class PackedCache<T> {
  private readonly entries = new Map<string, Buffer>();
  private bytes = 0;
  constructor(private readonly budget: number) {}
  get(key: string): T | undefined {
    const bytes = this.entries.get(key);
    if (!bytes) return undefined;
    this.entries.delete(key);
    this.entries.set(key, bytes);
    return JSON.parse(gunzipSync(bytes).toString("utf8"));
  }
  set(key: string, value: T) {
    if (this.entries.has(key)) return;
    const bytes = gzipSync(JSON.stringify(value), { level: 1 });
    if (bytes.length > this.budget) return;
    this.entries.set(key, bytes);
    this.bytes += bytes.length;
    while (this.bytes > this.budget) {
      const oldest = this.entries.entries().next().value;
      if (!oldest) break;
      this.bytes -= oldest[1].length;
      this.entries.delete(oldest[0]);
    }
  }
}

// Key by the complete request sent to the same native runner, including the
// screen, family, viewport and limit.
export class LayoutReplyCache {
  private readonly replies = new PackedCache<LayoutReply>(48 * 1024 * 1024);
  constructor(private readonly run: LayoutRunner) {}
  async batch(requests: readonly unknown[]): Promise<LayoutReply[]> {
    const keys = requests.map((request) => sha256(JSON.stringify(request)));
    const results = new Map<string, LayoutReply>();
    const missing = new Map<string, unknown>();
    for (const [index, key] of keys.entries()) {
      if (results.has(key) || missing.has(key)) continue;
      const hit = this.replies.get(key);
      if (hit) results.set(key, hit);
      else missing.set(key, requests[index]);
    }
    if (missing.size) {
      const replies = await this.run([...missing.values()]);
      let index = 0;
      for (const key of missing.keys()) {
        const reply = replies[index++];
        if (!reply) throw Error("Incomplete native layout batch");
        results.set(key, reply);
        // An empty-family query intentionally returns its semantic shape in
        // an uncovered-shape diagnostic.
        if (!reply.error || reply.uncoveredShape) this.replies.set(key, reply);
      }
    }
    return keys.map((key) => {
      const reply = results.get(key);
      if (!reply) throw Error("Missing layout reply");
      return reply;
    });
  }
}
