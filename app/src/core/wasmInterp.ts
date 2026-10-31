import type { Interp } from "./interp";

/** The envelope surface is generated from the real Lean API exports. */
export interface WasmEnvelopeInterp {
  init(input: string): string;
  step(input: string): string;
  view(input: string): string;
  facts(input: string): string;
  render(input: string): string;
}

/** Adapt the existing string seam without translating Lean data or semantics. */
export function createWasmInterp(wasm: WasmEnvelopeInterp): Interp {
  function factsInput(input: string): string {
    const parsed: unknown = JSON.parse(input);
    if (
      typeof parsed === "object" && parsed !== null &&
      "resourceType" in parsed && parsed.resourceType === "Bundle"
    ) return wasm.facts(input);
    return input;
  }
  function context(spec: string, program: string, facts: string, user: string) {
    // Preserve JSON number tokens, including Nats beyond JS's safe integer range.
    return `"spec":${spec},"program":${program},"facts":${factsInput(facts)},"user":${user}`;
  }
  return {
    init: (spec, program, facts, user) =>
      wasm.init(`{${context(spec, program, facts, user)}}`),
    step: (spec, program, facts, user, state, event) =>
      wasm.step(`{${context(spec, program, facts, user)},"state":${state},"event":${event}}`),
    view: (spec, program, facts, user, state) =>
      wasm.view(`{${context(spec, program, facts, user)},"state":${state}}`),
    facts: (bundle) => wasm.facts(bundle),
  };
}

/** Load once at app startup; all Interp methods then return synchronously. */
export async function loadWasmInterp(
  assetBase = `${import.meta.env.BASE_URL}ehr/`,
): Promise<Interp> {
  const base = new URL(assetBase.endsWith("/") ? assetBase : `${assetBase}/`, document.baseURI);
  const loaderUrl = new URL("interp-loader.mjs", base).href;
  const loader: {
    loadEhrInterp(options: { locateFile: (filename: string) => string }): Promise<WasmEnvelopeInterp>;
  } = await import(/* @vite-ignore */ loaderUrl);
  return createWasmInterp(await loader.loadEhrInterp({
    locateFile: (filename) => new URL(filename, base).href,
  }));
}
