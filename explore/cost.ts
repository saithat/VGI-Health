import type { Event } from '../lean/generated/ehr-types.js';
/** Declared typing proxy. Focus/Tab sequences are not measured. Palette clicks
use typed IDs; fields, confirmations and modal acknowledgments keep normal input. */
export function typingCost(event: Event, keyboard: boolean, palette: boolean): number {
  let typed = 0;
  if ('enter' in event) {
    const v = event.enter.value;
    typed = 'text' in v ? v.text.s.length : 'code' in v ? v.code.c.length :
      'qty' in v ? String(v.qty.tenths / 10).length : 'user' in v ? v.user.u.length : 1;
  }
  return typed + (keyboard ? palette && 'click' in event ? event.click.comp.length + 2 : 1 : 0);
}
