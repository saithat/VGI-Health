// This list is populated by build-ehr.sh from the actual Lean C exports.
export const leanExports = ["ehr_exotic", "ehr_facts", "ehr_init_envelope", "ehr_render", "ehr_render_ui", "ehr_screen_canonical", "ehr_step_envelope", "ehr_view_envelope"];

export async function loadEhrInterp(options = {}) {
  const { default: createModule } = await import('./ehr-interp.mjs');
  return wrapEhrInterp(await createModule(options));
}

export function wrapEhrInterp(module) {
  if (module._ehr_initialize() !== 0) throw new Error('Lean initialization failed');
  const available = new Set(leanExports);
  function call(name, input) {
    if (!available.has(name)) throw new Error(`Lean export ${name} is unavailable; rebuild after its API module lands`);
    if (typeof input !== 'string') throw new TypeError('Lean expects a JSON string');
    if (input.includes('\0')) throw new TypeError('Use JSON \\u0000 escapes instead of literal NUL');
    // Allocate on the heap: canonical programs can exceed ccall's stack scratch space.
    const bytes = module.lengthBytesUTF8(input) + 1;
    const pointer = module._malloc(bytes);
    if (!pointer) throw new Error('Unable to allocate Lean input');
    let output = 0;
    try {
      module.stringToUTF8(input, pointer, bytes);
      output = module.ccall('ehr_call_string', 'number', ['string', 'number'], [name, pointer]);
      if (!output) throw new Error(`Lean ${name} failed to allocate its result`);
      return module.UTF8ToString(output);
    } finally {
      if (output) module._ehr_free_string(output);
      module._free(pointer);
    }
  }
  return {
    exports: [...available],
    call,
    init: (input) => call('ehr_init_envelope', input),
    step: (input) => call('ehr_step_envelope', input),
    view: (input) => call('ehr_view_envelope', input),
    facts: (input) => call(available.has('ehr_facts_envelope') ? 'ehr_facts_envelope' : 'ehr_facts', input),
    render: (input) => call(available.has('ehr_render_envelope') ? 'ehr_render_envelope' : 'ehr_render', input),
  };
}
