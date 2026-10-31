// Await loading once; every subsequent step call is synchronous.
export async function loadEhr(options = {}) {
  const { default: createEhr } = await import('./ehr.mjs');
  return wrapEhr(await createEhr(options));
}

export function wrapEhr(module) {
  if (module._ehr_initialize() !== 0) throw new Error('Lean initialization failed');
  return {
    step(input) {
      if (typeof input !== 'string') throw new TypeError('step expects a JSON string');
      if (input.includes('\0')) throw new TypeError('Use JSON \\u0000 escapes instead of literal NUL');
      const output = module.ccall('ehr_step_string', 'number', ['string'], [input]);
      if (!output) throw new Error('Lean step failed to allocate its result');
      try {
        return module.UTF8ToString(output);
      } finally {
        module._ehr_free_string(output);
      }
    },
  };
}
