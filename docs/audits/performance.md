# Preview performance

Measured with one Chromium worker; wire bytes include headers. “Interactive” is a visible, usable version list or clinical shell. Each host uses a new context; switching measurements retain warm HTTP caches. These are local timings through real localhost and non-localhost Host headers, not a simulated slow Tailscale link. The router round trip asserts an unchanged document time origin and zero WASM requests.

| Host | Action | Bytes | Requests | Interactive ms | WASM requests |
|---|---|---:|---:|---:|---:|
| 127.0.0.1 | cold dashboard | 369,836 | 26 | 266 | 0 |
| 127.0.0.1 | EHR → dashboard | 1,166 | 11 | 78 | 0 |
| 127.0.0.1 | dashboard → EHR | 0 | 0 | 121 | 0 |
| vgi-audit.example.ts.net | cold dashboard | 428,628 | 26 | 165 | 0 |
| vgi-audit.example.ts.net | EHR → dashboard | 1,166 | 11 | 77 | 0 |
| vgi-audit.example.ts.net | dashboard → EHR | 0 | 0 | 112 | 0 |

Historical comparison inputs were retired by the terminology/data migration. This report records the current production bundle; absent baselines confer no before/after claim. The optimized initial dashboard requests one summary, no program versions, no day traces, no replay context and no WASM. Opening a version drawer hydrates the selected persona's versions, certificates and day traces plus replay context. Browser JSON caching deduplicates repeated detail requests.

Current build output is **7.8 MiB**, including Brotli and gzip variants. A measured optimized build took **10.6 seconds** including TypeScript (peak build RSS 897 MiB). No fixtures, runs or programs are copied into dist. Preview serves repository artifacts with ETags, encoding negotiation and revalidation; hashed assets and the manifest-hash-versioned WASM get a one-year immutable cache policy. The checkout is required alongside dist.

Reproduce with `pnpm --filter app build`, then `pnpm --filter app audit:performance`. The browser test resolves `vgi-audit.example.ts.net` to loopback and explicitly allows that Host on the test preview. It does not modify Tailscale Serve.
