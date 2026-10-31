# Change requests (from the checker lane)

Issues found while stating properties 1–12 over the interpreter and writing
the checker. Each says what goes wrong, what the checker does meanwhile, and
what we ask for. No property was weakened.

## CR-1. A finished order line can never be reopened (completability)

**What goes wrong.** `newOrderLine` moves `currentSlot` forward. Fields bound
to `Slot.current` then show the new line only. If the user (or a macro) adds a
line before the previous one meets its per-order-line requirements (for
example, a drug without a dose), no field can reach the old line again. The
commit guard then fails forever: the user is stuck. This breaks property 6
("from every reachable state, each commit is still reachable") for every
program that has an "add order" button and a per-order-line requirement.

**Meanwhile.** The checker rejects a program that has a `newOrderLine` button
when a required commit has a per-order-line entry requirement (property
`completable`). This will reject a canonical program that uses "add order".

**Ask (lane A).** Make `newOrderLine` an ordinary hard stop: blocked, with a
reason ("finish this order line first"), while the current line has a drug and
misses a per-order-line requirement. (Or add an action that selects an
existing order line.) With that, the checker can accept "add order" buttons.

## CR-2. `unlessReceipt` can hide information the commit still needs

**What goes wrong.** `unlessReceipt i` hides a component when *some*
receipt-accepting review requirement for `i` has a valid receipt. If another
commit's requirement for `i` is stricter (shorter window, fewer roles), the
info is hidden on that commit's screen while the receipt does not count for
it. The guard then blocks with nothing the user can do.

**Meanwhile.** The checker accepts an `unlessReceipt i` pin on a commit screen
only if every receipt-accepting requirement for `i` has a window no longer and
roles no wider than the requirement it pins for. Otherwise the pin must be
`always`. No change needed unless lane A prefers a per-commit rule.

## CR-3. Passive-alert screens are program screen IDs

**What goes wrong.** `AlertSpec.screens` names screens by ID. A program that
renames or drops the screen escapes property A1 (passive alerts shown inline):
there is no screen left on which the alert must be shown.

**Meanwhile.** Besides property A1, the checker requires every screen a
passive alert lists that exists in the canonical program to also exist in the
candidate.

**Ask (owner/content).** Consider naming workflows or commits instead of
screen IDs in `AlertSpec.screens`.

## CR-4. Review waivers (`ReviewReq.waivedBy`) — pending

Lane A is adding `waivedBy` (met if the waiver element is entered by a human
and confirmed). When it lands, properties 4 and 6 add the waiver as a third
way to meet a review requirement, and the checker accepts "info pinned, or the
waiver field reachable before the commit" for waivable requirements.
