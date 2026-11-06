import { archivedReleaseEventId } from '../../scripts/historical-releases.mjs';
import type { WorldState } from './state';

/** Frozen random-stream identity. Terminology changes must not redraw clinical cases. */
export const INBOX_RANDOM_STREAM = 'p1-inbasket';

/** Serialization for hashing only. Persisted world state and UI retain neutral keys.
 * These pre-rename bytes are part of the seed-1 experiment, like release-event IDs.
 */
export function seedState(state: WorldState): unknown {
  const {inboxBacklog, today, context, ...rest} = state;
  const {inbox, events, ...restToday} = today;
  return {...rest, inBasketBacklog:inboxBacklog,
    context:{...context,scriptedEvents:context.scriptedEvents.map(archivedReleaseEventId)},
    today:{...restToday,inBasket:inbox,events:events.map(event=>
      event.replace(/walk-ins, inbox deferred$/, 'walk-ins, in-basket deferred'))}};
}
