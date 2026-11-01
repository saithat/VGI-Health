# Visible control audit

Run serially after building, so the TypeScript/Vite build never competes with Chromium:

```sh
pnpm --filter app build
pnpm --filter app audit:buttons
pnpm --filter app test:buttons
pnpm --filter app audit:performance
```

The audit starts `vite preview` itself. It uses one Chromium worker and closes the previous page before opening a new screen. The fast regression gates the generated app report and exercises dashboard controls; the separate Lean test traverses observed live episodes breadth first. `APP_TEST_PORT` overrides port 4186. Local Medplum must be available through `/medplum` and persona login must be configured in the gitignored root `.env`.

`buttons.json` and `buttons.md` contain every observation, including repeated controls in different persona/version contexts. `buttons-app.json` and `buttons-ehr.json` are the writer's inputs. `buttons-before-app.json` preserves the complete pre-fix app pass. Counts are observations, not distinct labels. `ehr-dead-controls.md` identifies content/render findings without changing Lean.

Each clinical click restores an actual observed checkpoint. The seam cannot inject events, facts or clinical state. Captured input is not substituted for source evidence. Search and code pickers, checkboxes, confirms, tabs, navigation, section controls and modal acknowledgements are inventoried; ordinary text fields are filled only when needed to reach an action. Confirming an existing prefill uses the UI's own confirm action. Enabled clinical actions run against the real local Medplum adapter; disabled commits retain the interpreter's reason. A successful shell transition does not certify a clinical write.

The app baseline completed before fixes. The original exhaustive Lean pass was interrupted after its first screen because repeatedly rebuilding inspector views made restoration prohibitively slow. The final Lean inventory uses cached observed snapshots and the committed WASM. There is no complete pre-fix Lean count; comparisons must keep the app baseline separate rather than imply a matched before/after clinical census.

Performance measurements use Chrome DevTools `Network.loadingFinished.encodedDataLength` (wire bytes including headers) and request events. “Interactive” means the version list or clinical shell is present and clickable. Each host gets a fresh browser context; the round trip follows a cold dashboard visit, so HTTP caches are warm. Standard anchors to the same routes exercise the document navigation baseline and the client router after the change. The synthetic non-localhost name resolves to loopback in Chromium and is explicitly allowed by the test preview, so the actual Host header differs without needing a Tailscale daemon. A round trip must retain `performance.timeOrigin` and issue no new WASM request.

The preview server serves repository artifacts directly; it is part of the deployment contract. `dist` alone is no longer a standalone static export. Keep the checkout and run `make run` or Vite preview from `app`.
