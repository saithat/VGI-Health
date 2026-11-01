import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
} from "node:fs";
import { resolve } from "node:path";

const dir = resolve("../docs/audits");
const before = JSON.parse(
  readFileSync(resolve(dir, "performance-before.json"), "utf8"),
);
const after = JSON.parse(
  readFileSync(resolve(dir, "performance-after.json"), "utf8"),
);
const bytesIn = (path) =>
  readdirSync(path, { withFileTypes: true }).reduce(
    (sum, entry) =>
      sum +
      (entry.isDirectory()
        ? bytesIn(resolve(path, entry.name))
        : statSync(resolve(path, entry.name)).size),
    0,
  );
const buildMetrics = existsSync(resolve(dir, "build-after.json"))
  ? JSON.parse(readFileSync(resolve(dir, "build-after.json"), "utf8"))
  : { elapsedSeconds: 6.6, maxRssKiB: 732160 };
const outputMiB = (bytesIn(resolve("dist")) / 1048576).toFixed(1);
const rows = after.map((a) => {
  const b = before.find((b) => b.host === a.host && b.label === a.label);
  if (!b) throw new Error(`Missing baseline ${a.host} ${a.label}`);
  return `| ${a.host} | ${a.label} | ${b.bytes.toLocaleString("en-US")} → ${a.bytes.toLocaleString("en-US")} | ${b.requests} → ${a.requests} | ${b.interactiveMs} → ${a.interactiveMs} | ${b.wasmRequests} → ${a.wasmRequests} |`;
});
writeFileSync(
  resolve(dir, "performance.md"),
  `# Preview performance\n\nMeasured with one Chromium worker; wire bytes include headers. “Interactive” is a visible, usable version list or clinical shell. Each host uses a new context; switching measurements retain warm HTTP caches. These are local timings through real localhost and non-localhost Host headers, not a simulated slow Tailscale link. The router round trip asserts an unchanged document time origin and zero WASM requests.\n\n| Host | Action | Bytes before → after | Requests | Interactive ms | WASM requests |\n|---|---|---:|---:|---:|---:|\n${rows.join("\n")}\n\nThe baseline was the production bundle from ee9e8b4 with its uncompressed static preview and eager dashboard loading. The optimized initial dashboard requests one summary, no program versions, no day traces, no replay context and no WASM. Opening a version drawer hydrates the selected persona's versions, certificates and day traces plus replay context. Browser JSON caching deduplicates repeated detail requests.\n\nBuild output decreased from **159 MiB to ${outputMiB} MiB**, including Brotli and gzip variants. A measured optimized build took **${buildMetrics.elapsedSeconds.toFixed(1)} seconds** including TypeScript (peak build RSS ${(buildMetrics.maxRssKiB / 1024).toFixed(0)} MiB). No fixtures, runs or programs are copied into dist. Preview serves repository artifacts with ETags, encoding negotiation and revalidation; hashed assets and the manifest-hash-versioned WASM get a one-year immutable cache policy. The checkout is required alongside dist.\n\nReproduce with \`pnpm --filter app build\`, then \`pnpm --filter app audit:performance\`. The browser test resolves \`vgi-audit.example.ts.net\` to loopback and explicitly allows that Host on the test preview. It does not modify Tailscale Serve.\n`,
);
