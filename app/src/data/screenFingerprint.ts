/** Host implementation of Ehr.Render.UiScreen.canonical's wire grammar.
 * Independent encoding prevents a WASM serializer fault masking a render fault.
 * Keys use Unicode scalar order; lengths count UTF-8 bytes. */
export function screenCanonical(value: unknown): string {
  const encoder = new TextEncoder();
  const scalarOrder = (a: string, b: string) => {
    const x = Array.from(a, (c) => c.codePointAt(0) ?? 0);
    const y = Array.from(b, (c) => c.codePointAt(0) ?? 0);
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
    }
    return x.length - y.length;
  };
  function encode(v: unknown): string {
    if (v === null) return "n";
    if (typeof v === "boolean") return v ? "t" : "f";
    if (typeof v === "string") {
      if (
        Array.from(v).some((c) => {
          const n = c.codePointAt(0) ?? 0;
          return n >= 0xd800 && n <= 0xdfff;
        })
      )
        throw new Error("Screen contains invalid Unicode");
      return `s${encoder.encode(v).length}:${v}`;
    }
    if (typeof v === "number" && Number.isSafeInteger(v)) return `i${v};`;
    if (Array.isArray(v)) return `a${v.length}:${v.map(encode).join("")}`;
    if (typeof v === "object" && v !== null) {
      const entries = Object.entries(v).sort(([a], [b]) => scalarOrder(a, b));
      return `o${entries.length}:${entries.map(([k, item]) => encode(k) + encode(item)).join("")}`;
    }
    throw new Error("Screen contains a non-wire value");
  }
  return "vgi-screen-v1:" + encode(value);
}
export interface ScreenFrame {
  step: number;
  phase: "ready" | "loading";
  hash: string;
}
export async function screenHash(bytes: string): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bytes)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
/** Only the painter calls observe. Capture bytes synchronously before hashing. */
export function screenJournal(
  serialize: ((input: string) => string) | undefined,
) {
  let frames: { step: number; phase: ScreenFrame["phase"]; bytes: string }[] =
    [];
  let failure: unknown;
  return {
    observe(
      screen: unknown,
      step: number,
      phase: ScreenFrame["phase"] = "ready",
    ) {
      try {
        const bytes = screenCanonical(screen);
        if (
          !serialize ||
          JSON.parse(serialize(JSON.stringify(screen))) !== bytes
        )
          throw new Error(
            "Screen serialization differs from the painted object. Reopen the EHR.",
          );
        if (
          !frames.some(
            (f) => f.step === step && f.phase === phase && f.bytes === bytes,
          )
        )
          frames.push({ step, phase, bytes });
      } catch (error) {
        failure = error;
      }
    },
    async evidence(requestId: string) {
      if (failure) throw failure;
      return {
        requestId,
        frames: await Promise.all(
          frames.map(async ({ bytes, ...f }) => ({
            ...f,
            hash: await screenHash(bytes),
          })),
        ),
      };
    },
    clear() {
      frames = [];
      failure = undefined;
    },
  };
}
