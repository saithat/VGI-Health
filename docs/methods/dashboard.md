# Dashboard views

[Overview](../../README.md) · [Recording data](run-data.md)

The dashboard reviews saved recordings. Its shell handles URL parameters, run
selection and refresh, lazy evidence loading, tabs and the header. Views retain
the same markup, classes, links, query parameters, replay keys and interactions.

| Module in `app/src/dashboard/` | Responsibility |
|---|---|
| `Dashboard.tsx` | Shell, routing, run/detail loading and selected view (480 lines). |
| `Releases.tsx` | Release grid, migration details and kept-customization formatting. |
| `BreakPanel.tsx` | Recorded rejected proposals and the optional local attempt form. |
| `VersionList.tsx` | Version history, measured effects and quiet-night grouping. |
| `Certificate.tsx` | Certificate details and uncertified status. |
| `DecisionDrawers.tsx` | Decision record drawer, before/after modal and counterexample replay. |
| `formatting.ts` | Recorded event labels and predicted-savings formatting. |
| `rejections.ts` | Shared rejected-proposal extraction and selection types. |
| `Badge.tsx` | Shared status badge markup. |

This was a mechanical extraction from the 1,849-line shell. Comparing extracted
blocks with the original source, removing only export modifiers, gives identical
text. Reconstructing the original shell from the extracted drawer/modal JSX also
gives identical text. No certified application source or styling changed.

## Validation

Commands ran from the repository root with
`TMPDIR=/home/saithat/Projects/run-tmp`. Playwright used one desktop worker and
the shared `$TMPDIR/vgi-browser-heavy.lock`.

| Command | Result |
|---|---|
| `pnpm --filter app exec tsc --noEmit -p tsconfig.json` | Passed. |
| `pnpm --filter app exec eslint src/dashboard` | Passed. |
| `pnpm --filter app exec vitest run` | 208 passed, 9 skipped, 10 failed in four archive-backed files. |
| `pnpm --filter app exec vitest run tests/revision-history.test.ts tests/lazy-run.test.ts tests/workload.test.ts tests/recheck-revision.test.ts --maxWorkers=2` with the original dashboard source | The same 10 failures, 8 passed; confirms the missing-data failures predate the split. |
| `pnpm --filter app build`, before and after extraction | Both passed; certified application hash is identical: `f9c9dfe22edcae5ee04495a881b53b398b9bb6afa57e55b04a4a491610d190cf`. |
| `APP_TEST_PREVIEW=0 VGI_RUN='' pnpm --filter app exec playwright test dashboard.spec.ts --project=desktop --workers=1` | 2 passed, 1 skipped, 1 failed: the complete-recording assertion sees zero completed days instead of ten. This filename pattern also selects `live-dashboard.spec.ts`. |

Available-data browser follow-up: `APP_TEST_PREVIEW=1 VGI_RUN='' pnpm --filter app exec playwright test 'e2e/dashboard\.spec\.ts$' 'e2e/live-dashboard\.spec\.ts$' --project=desktop --workers=1 --grep 'empty dashboard|active summary refresh'` passed both tests against the final build.

The available recording copies contain manifests and programs, but lack day and
decision files, including `runs/core-10day/decisions/night-05/P3.json` and
`runs/core-10day/days/day-01/P3.json`. The affected unit files are
`revision-history`, `lazy-run`, `workload` and `recheck-revision`. Setting
`VGI_RUN=core-10day` for a second targeted browser attempt was also rejected by
the server because this partial run is not replayable (one test passed, two
failed). No test expectations or data-presence checks were changed.

## Complete-recording check

Restore a matching complete recording, then run:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
pnpm --filter app exec vitest run
APP_TEST_PREVIEW=1 VGI_RUN=core-10day flock -w 120 "$TMPDIR/vgi-browser-heavy.lock" \
  pnpm --filter app exec playwright test \
  'e2e/dashboard\.spec\.ts$' 'e2e/live-dashboard\.spec\.ts$' \
  'e2e/dashboard-performance\.spec\.ts$' --project=desktop --workers=1
```

The preview build already exists after the build check; omit
`APP_TEST_PREVIEW=1` to build it again. These recording views need no Docker,
Postgres or Keycloak stack and use the test web server on port **4179**; no
Compose project applies. No full recording, browser/WCAG audit pair or retained
recertification was performed.
