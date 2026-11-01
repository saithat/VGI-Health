# Preview performance

Measured with one Chromium worker; wire bytes include headers. “Interactive” is a visible, usable version list or clinical shell. Each host uses a new context; switching measurements retain warm HTTP caches. These are local timings through real localhost and non-localhost Host headers, not a simulated slow Tailscale link. The router round trip asserts an unchanged document time origin and zero WASM requests.

| Host | Action | Bytes before → after | Requests | Interactive ms | WASM requests |
|---|---|---:|---:|---:|---:|
| 127.0.0.1 | cold dashboard | 3,160,539 → 263,238 | 88 → 18 | 1007 → 854 | 1 → 0 |
| 127.0.0.1 | EHR → dashboard | 11,488 → 901 | 88 → 9 | 970 → 214 | 1 → 0 |
| 127.0.0.1 | dashboard → EHR | 1,963 → 1,052 | 13 → 4 | 278 → 121 | 1 → 0 |
| vgi-audit.example.ts.net | cold dashboard | 3,160,227 → 288,518 | 88 → 18 | 501 → 220 | 1 → 0 |
| vgi-audit.example.ts.net | EHR → dashboard | 11,176 → 901 | 88 → 9 | 972 → 209 | 1 → 0 |
| vgi-audit.example.ts.net | dashboard → EHR | 1,651 → 1,052 | 13 → 4 | 280 → 118 | 1 → 0 |

The baseline was the production bundle from ee9e8b4 with its uncompressed static preview and eager dashboard loading. The optimized initial dashboard requests one summary, no program versions, no day traces, no replay context and no WASM. Opening a version drawer hydrates the selected persona's versions, certificates and day traces plus replay context. Browser JSON caching deduplicates repeated detail requests.

Build output decreased from **159 MiB to 4.7 MiB**, including Brotli and gzip variants. A measured optimized build took **7.7 seconds** including TypeScript (peak build RSS 749 MiB). No fixtures, runs or programs are copied into dist. Preview serves repository artifacts with ETags, encoding negotiation and revalidation; hashed assets and the manifest-hash-versioned WASM get a one-year immutable cache policy. The checkout is required alongside dist.

Reproduce with `pnpm --filter app build`, then `pnpm --filter app audit:performance`. The browser test resolves `vgi-audit.example.ts.net` to loopback and explicitly allows that Host on the test preview. It does not modify Tailscale Serve.
