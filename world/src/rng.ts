/**
 * Deterministic randomness. No `Math.random`, no clocks: every value comes from
 * a seed string, so the same (seed, day, world state) always gives the same day.
 */

/** cyrb53: a fast 53-bit string hash (public domain). */
export function hash53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Hex digest of `hash53`, for logging seeds and state hashes. */
export function hashHex(str: string): string {
  return hash53(str).toString(16).padStart(14, "0");
}

/** JSON with object keys sorted, so hashing does not depend on insertion order. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** sfc32 PRNG seeded from a string. */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  readonly seed: string;

  constructor(seed: string) {
    this.seed = seed;
    const h = hash53(seed);
    const h2 = hash53(seed, 1);
    this.a = h >>> 0;
    this.b = Math.floor(h / 4294967296) >>> 0;
    this.c = h2 >>> 0;
    this.d = 1;
    for (let i = 0; i < 12; i++) this.next();
  }

  /** A child stream that does not disturb this one's sequence. */
  fork(label: string): Rng {
    return new Rng(`${this.seed}/${label}`);
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** Integer in [lo, hi], inclusive. */
  int(lo: number, hi: number): number {
    if (hi < lo) return lo;
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** Uniform real in [lo, hi). */
  real(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error(`Rng.pick on empty list (${this.seed})`);
    return item;
  }

  /** Pick by weight. Entries with weight <= 0 are never picked. */
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((s, [, w]) => s + Math.max(0, w), 0);
    if (total <= 0) throw new Error(`Rng.weighted with no positive weights (${this.seed})`);
    let r = this.next() * total;
    for (const [item, w] of items) {
      if (w <= 0) continue;
      r -= w;
      if (r < 0) return item;
    }
    const last = [...items].reverse().find(([, w]) => w > 0);
    if (last === undefined) throw new Error("unreachable");
    return last[0];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const a = out[i];
      const b = out[j];
      if (a === undefined || b === undefined) continue;
      out[i] = b;
      out[j] = a;
    }
    return out;
  }

  /** Normal(mean, sd) via Box–Muller. */
  normal(mean: number, sd: number): number {
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Poisson(lambda) by inversion (fine for the small means used here). */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const l = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.next();
    } while (p > l && k < 1000);
    return k - 1;
  }
}
