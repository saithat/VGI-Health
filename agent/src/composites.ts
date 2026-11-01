/** Source-only composition. Safety is checked on the complete lowered executable. */
import { z } from 'zod';
import { programSchema, type Component, type Program } from './lean-types.js';
const useSchema = z.object({ use: z.object({ name: z.string(), args: z.array(z.tuple([z.string(), z.string()])) }) });
export function compositeUses(program: Program): { id: string; name: string }[] {
  return program.screens.flatMap((screen) => screen.components.flatMap((component) => {
    const use = useSchema.safeParse(component.kind);
    return use.success ? [{ id: component.id, name: use.data.use.name }] : [];
  }));
}
export function expandProgram(source: Program): Program {
  const definitions = new Map((source.componentDefs ?? []).map((def) => [def.name, def]));
  if (definitions.size !== (source.componentDefs ?? []).length) throw new Error('Duplicate composite definition');
  for (const def of definitions.values()) {
    if (new Set(def.params).size !== def.params.length) throw new Error(`Duplicate parameters in ${def.name}`);
    if (def.body.some((c) => typeof c.kind === 'object' && 'use' in c.kind)) throw new Error('Nested composite use is forbidden');
  }
  const screens = source.screens.map((screen) => ({ ...screen, components: screen.components.flatMap((component): Component[] => {
    if (typeof component.kind !== 'object' || !('use' in component.kind)) return [component];
    const { use } = useSchema.parse(component.kind);
    const def = definitions.get(use.name);
    if (!def) throw new Error(`Unknown composite ${use.name}`);
    const args = new Map(use.args);
    if (args.size !== use.args.length || args.size !== def.params.length || def.params.some((p) => !args.has(p)) || [...args.keys()].some((p) => !def.params.includes(p)))
      throw new Error(`Composite ${use.name}: arguments must match parameters exactly`);
    // A JSON string round trip substitutes data only, never executable code.
    const body = def.body.map((c) => JSON.parse(JSON.stringify(c).replace(/\{\{([\w-]+)\}\}/g, (_match, name: string) => {
      const value = args.get(name);
      if (value === undefined) throw new Error(`Unbound composite parameter ${name}`);
      return JSON.stringify(value).slice(1, -1);
    })));
    const parsed = programSchema.parse({ ...source, screens: [{ ...screen, components: body }] }).screens[0]?.components ?? [];
    const ids = new Set(parsed.map((c) => c.id));
    if (ids.size !== parsed.length) throw new Error('Duplicate composite body ids');
    const prefix = (id: string) => `${component.id}.${id}`;
    const container: Component = { ...component, kind: { group: { collapsible: false, startCollapsed: false } } };
    const children = parsed.map((c) => {
      if (c.parent && !ids.has(c.parent)) throw new Error('Composite parent must be inside its template');
      return { ...c, id: prefix(c.id), parent: c.parent ? prefix(c.parent) : component.id,
        ...(c.copyOf && ids.has(c.copyOf) ? { copyOf: prefix(c.copyOf) } : {}) };
    });
    return [container, ...children];
  }) }));
  const program = { ...source };
  delete program.componentDefs;
  delete program.presentationComponents;
  return programSchema.parse({ ...program, screens });
}
