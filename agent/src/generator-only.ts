import type { JsonLlm } from './backends/types.js';
/** Offline sentinel: even an accidental proposal/migration/repair call cannot use a model. */
export const generatorOnlyBackend:JsonLlm={name:'scripted',model:'admitted-generator-only-v1',
  async complete(){throw Error('Generator-only discovery refuses all model calls; use a fixed vendor release');}};
