# World status

Requested world work: **nothing left**. Full details, contracts, commands and
an external albuterol-cap follow-up are in [HANDOFF-world.md](../HANDOFF-world.md).

The committed seed-1 ten-day run uses all 174 Synthea patients. It is 5.48 MB,
contains 1,284 tasks and loads through the real agent loader. All 25 formulary
entries match Lean, including its newly added generic absolute-cap values.

Supply, CURES exemptions, holds/refusals, pain, W6 steps and refill reasons use
typed core fields. P1/P5 emit imaging and procedure orders after the v1.1
release. Remaining clinical facts use structured FHIR observations, not encoded
note IDs. The replay includes persona parameters and both schedule layouts.

Lean build, world build/lint and all 92 tests pass. The contract suite decodes
and re-encodes all 50 real-population schedules with Lean and checks the
formulary; run `cd lean && lake build` before tests, never concurrently.

External request: core's albuterol absolute cap is still unspecified; the
world's 5 mg regimen cap is correct for the heavy-child scenarios. See the
precise request in [changes-requests.md](../docs/design/changes-requests.md).
