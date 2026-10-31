import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "vite";
if (!process.argv[2]) {
  process.stderr.write(
    "Usage: pnpm --filter app export-mock-pages <output-directory>\n",
  );
  process.exit(1);
}
const output = resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2]);
const server = await createServer({ server: { middlewareMode: true } });
try {
  const { pages } = await server.ssrLoadModule("/src/mock/export.ts");
  mkdirSync(output, { recursive: true });
  for (const [name, tree] of Object.entries(pages))
    writeFileSync(
      resolve(output, `${name}.json`),
      JSON.stringify(tree, null, 2) + "\n",
    );
  process.stdout.write(
    `Exported ${Object.keys(pages).length} MOCK page trees to ${output}\n`,
  );
} finally {
  await server.close();
}
