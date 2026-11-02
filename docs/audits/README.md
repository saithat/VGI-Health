# Control and performance checks

Run after building, with local Medplum available:

```sh
pnpm --filter app build
pnpm --filter app audit:buttons
pnpm --filter app test:buttons
pnpm --filter app audit:performance
```

Control regressions read buttons.json, buttons-app.json and buttons-ehr.json.
The report also reads the optional buttons-before-app.json baseline.
Performance reporting reads performance-before.json, performance-after.json
and optional build-after.json. These inputs remain committed for the scripts.
Generated reports describe sampled controls and do not prove clinical effects.
