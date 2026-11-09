#!/usr/bin/env node
// Lint the inline viewer scripts and the artifact checker with browser globals.
import { ESLint } from "../../app/node_modules/eslint/lib/api.js";
import js from "../../app/node_modules/@eslint/js/src/index.js";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { dirname, resolve } from "node:path";

const lint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    js.configs.recommended,
    {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: Object.fromEntries(
          [
            "document",
            "window",
            "location",
            "innerWidth",
            "setTimeout",
            "clearTimeout",
            "console",
            "process",
          ].map((name) => [name, "readonly"]),
        ),
      },
    },
  ],
});
const results = [];
for (const file of ["index.html", "imports.html"]) {
  const path = fileURLToPath(new URL(file, import.meta.url));
  const html = await readFile(path, "utf8");
  const script = /<script>\s*([\s\S]*?)<\/script>/.exec(html);
  if (!script) throw new Error(`No viewer script in ${file}`);
  results.push(...(await lint.lintText(script[1], { filePath: path + ".js" })));
}
results.push(
  ...(await lint.lintFiles(
    ["check.mjs", "lint.mjs"].map((file) =>
      fileURLToPath(new URL(file, import.meta.url)),
    ),
  )),
);
console.log(
  (await lint.loadFormatter("stylish")).format(results) ||
    "Proof-map JavaScript lint passed.",
);
if (results.some((result) => result.errorCount || result.warningCount))
  process.exit(1);

// Check the changed documentation's local links and basic Markdown structure.
const root = fileURLToPath(new URL("../../", import.meta.url));
for (const file of [
  "README.md",
  "docs/proof-map.md",
  "docs/proof-walkthrough.md",
]) {
  const path = resolve(root, file),
    text = await readFile(path, "utf8");
  if ((text.match(/^```/gm) ?? []).length % 2)
    throw new Error(`Unclosed code fence: ${file}`);
  if (/[ \t]+$/m.test(text)) throw new Error(`Trailing whitespace: ${file}`);
  for (const [, target] of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    await access(resolve(dirname(path), target.split("#")[0]));
  }
}
console.log("Documentation links and Markdown structure passed.");
