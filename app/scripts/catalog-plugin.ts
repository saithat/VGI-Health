import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { Plugin } from 'vite';
// Shared with the dependency-free verdict generator.
import { buildCatalog, root } from './catalog.mjs';

export function catalogPlugin(): Plugin {
  return {
    name: 'offline-ui-catalog',
    configureServer(server) {
      let catalog: Promise<unknown> | undefined;
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (pathname !== '/catalog.json' && !/^\/(releases|programs|fixtures)\//.test(pathname)) return next();
        try {
          res.setHeader('Content-Type', 'application/json');
          if (pathname === '/catalog.json') {
            res.end(JSON.stringify(await (catalog ??= buildCatalog())));
          } else {
            const file = resolve(root, decodeURIComponent(pathname.slice(1)));
            if (!file.startsWith(root + sep) || !file.endsWith('.json')) throw new Error('Invalid static path');
            res.end(await readFile(file));
          }
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Offline artifact unavailable' }));
        }
      });
    },
    async closeBundle() {
      const output = resolve(root, 'app/dist');
      for (const directory of ['releases', 'programs', 'fixtures']) {
        await cp(resolve(root, directory), resolve(output, directory), { recursive: true });
      }
      await writeFile(resolve(output, 'catalog.json'), JSON.stringify(await buildCatalog()));
      for (const route of ['browse', 'ehr']) {
        await mkdir(resolve(output, route), { recursive: true });
        await cp(resolve(output, 'index.html'), resolve(output, route, 'index.html'));
      }
    },
  };
}
