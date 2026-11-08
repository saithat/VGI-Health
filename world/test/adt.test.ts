import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { nativeAdt, simulateAdt } from '../src/adt';
import { run } from './helpers';

it('generates seed-stable native ADT swaps and all corrections with a separate transport process', async () => {
  const world = run(1), original = structuredClone(world);
  const native = nativeAdt(process.env.EHR_BIN ?? resolve(__dirname, '../../lean/.lake/build/bin/ehr'));
  try {
    const rates = {transferPerPatientDay:1, swapPerBoardDay:1, erroneousAdmission:1,
      erroneousTransfer:1, erroneousDischargePerPatientDay:1};
    const first = await simulateAdt(world,native.apply,rates);
    expect(await simulateAdt(world,native.apply,rates)).toEqual(first);
    expect(world).toEqual(original);
    const kinds = new Set(first.events.flatMap(e => Object.keys(e.command)));
    for (const kind of ['admit','discharge','transfer','swap','cancelAdmit','cancelTransfer','cancelDischarge','clean','ready']) expect(kinds.has(kind),kind).toBe(true);
    expect(first.transport.length).toBeGreaterThan(0);
    expect(first.transport.some(t => t.outcome === 'superseded')).toBe(true);
    for (const t of first.transport) {
      const event = first.events.find(e => e.id === t.event);
      expect(event).toBeDefined();
      expect(t.day*1440+t.minute).toBeGreaterThan((event?.day ?? 0)*1440+(event?.minute ?? 0));
    }
    for (const p of first.final.patients) {
      const beds = first.final.beds.filter(b => b.occupant === p.id);
      expect(beds).toHaveLength(p.bed === null ? 0 : 1);
      if (p.bed !== null) expect(beds[0]?.id).toBe(p.bed);
    }
    const normal = await simulateAdt(world,native.apply);
    expect(await simulateAdt(world,native.apply)).toEqual(normal);
    expect(normal.events.length).toBeGreaterThan(0);
  } finally { native.close(); }
}, 120000);
