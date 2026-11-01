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
  function checked(output: string): string {
    const value: unknown = JSON.parse(output);
    if (typeof value === "object" && value !== null && "error" in value)
      throw new Error(`Lean: ${String(value.error)}`);
    return output;
  }
  let lastInput = "";
  let lastProjection = { facts: "", display: "" };
  function projection(input: string) {
    if (input === lastInput) return lastProjection;
    let parsed: unknown = JSON.parse(input);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "resourceType" in parsed &&
      parsed.resourceType === "Bundle"
    ) {
      parsed = JSON.parse(
        checked(
          wasm.facts(
            `{"bundle":${input},"context":{"today":"2026-10-31","now":0,"receipts":[],"record":[]}}`,
          ),
        ),
      );
    }
    const output =
      typeof parsed === "object" &&
      parsed !== null &&
      "facts" in parsed &&
      "display" in parsed
        ? {
            facts: JSON.stringify(parsed.facts),
            display: JSON.stringify(parsed.display),
          }
        : { facts: input, display: "" };
    lastInput = input;
    lastProjection = output;
    return output;
  }
  function context(
    spec: string,
    program: string,
    facts: string,
    user: string,
    render = false,
  ) {
    const data = projection(facts);
    return `"spec":${spec},"program":${program},"facts":${data.facts},"user":${user}${render && data.display ? `,"display":${data.display}` : ""}`;
  }
  return {
    init: (spec, program, facts, user) =>
      checked(wasm.init(`{${context(spec, program, facts, user)}}`)),
    step: (spec, program, facts, user, state, event) =>
      checked(
        wasm.step(
          `{${context(spec, program, facts, user)},"state":${state},"event":${event}}`,
        ),
      ),
    view: (spec, program, facts, user, state) =>
      checked(
        wasm.view(`{${context(spec, program, facts, user)},"state":${state}}`),
      ),
    render: (spec, program, facts, user, state) =>
      checked(
        wasm.render(
          `{${context(spec, program, facts, user, true)},"state":${state}}`,
        ),
      ),
    facts: (bundle) => checked(wasm.facts(bundle)),
  };
}

/** Load once at app startup; all Interp methods then return synchronously. */
export async function loadWasmInterp(
  assetBase = `${import.meta.env.BASE_URL}ehr/`,
): Promise<Interp> {
  const base = new URL(
    assetBase.endsWith("/") ? assetBase : `${assetBase}/`,
    document.baseURI,
  );
  const loaderUrl = new URL("interp-loader.mjs", base).href;
  const loader: {
    loadEhrInterp(options: {
      locateFile: (filename: string) => string;
    }): Promise<WasmEnvelopeInterp>;
  } = await import(/* @vite-ignore */ loaderUrl);
  return createWasmInterp(
    await loader.loadEhrInterp({
      locateFile: (filename) => new URL(filename, base).href,
    }),
  );
}
