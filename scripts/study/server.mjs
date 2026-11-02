/** Loopback-only research server. No clinical proxy, run catalog or live auth routes. */
import path from 'node:path';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { createServer } from '../../app/node_modules/vite/dist/node/index.js';
import react from '../../app/node_modules/@vitejs/plugin-react/dist/index.js';
import { sessionSchema, sequence } from '../../app/src/dashboard/study/model.ts';
import { root, read, hash, arg, outputDir, ensureOutput, writeNew } from './common.mjs';
export async function startStudy({ out, consent, dryRun = false, port = 0 }) {
  await ensureOutput(out);
  const manifest = await read(path.join(out, 'manifest.json'));
  const { manifestHash, ...content } = manifest;
  if (manifestHash !== hash(content) || manifest.synthetic !== true || manifest.cases.length !== 4)
    throw Error('Invalid frozen study manifest');
  const wasm = await readFile(path.join(root, 'app/public/ehr/ehr-interp.wasm'));
  if (hash(wasm) !== manifest.provenance.wasmSha256) throw Error('WASM changed since task preparation');
  if (!dryRun && (!consent || /\[[A-Z][^\]]*\]/.test(consent)))
    throw Error('Supply adapted --consent text without template placeholders before human recruitment');
  const consentText = dryRun ? 'SIMULATED DRY RUN ONLY. No human participant or valid research consent.' : consent;
  const token = hash(`${manifestHash}\n${consentText}\n${dryRun}`);
  const settings = { manifestHash, dryRun, consentSha256: hash(consentText) };
  const settingsPath = path.join(out, 'study-settings.json');
  try {
    if (JSON.stringify(await read(settingsPath)) !== JSON.stringify(settings)) throw Error('Study mode/consent changed; use a fresh study directory');
  } catch (error) { if (error.code !== 'ENOENT') throw error; await writeNew(settingsPath, settings); }
  const headers = res => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); };
  const issued = new Map();
  let lastStamp = 0;
  // Detect prior participant IDs before allowing a new session on restart.
  const sessionsDir = path.join(out, 'sessions');
  await mkdir(sessionsDir, { recursive: true, mode: 0o700 });
  for (const name of await readdir(sessionsDir)) {
    const match = /^(P\d{3})--([\da-f-]{36})--\d+\.json$/.exec(name);
    if (match) issued.set(match[1], match[2]);
  }
  const server = await createServer({
    root: path.join(root, 'app'), configFile: false, plugins: [react(), {
      name: 'local-study', configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0];
          if (url === '/study') {
            headers(res); res.setHeader('Content-Type', 'text/html');
            const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VGI human study</title></head><body><div id="root"></div><script type="module" src="/src/dashboard/study/main.tsx"></script></body></html>';
            res.end(await vite.transformIndexHtml('/study', html)); return;
          }
          if (!url?.startsWith('/api/study/')) return next();
          headers(res); res.setHeader('Content-Type','application/json');
          try {
            // Disallow cross-site writes and DNS rebinding. No CORS permission is granted.
            const host = req.headers.host;
            if (!/^127\.0\.0\.1:\d+$/.test(host ?? '') || (req.headers.origin && req.headers.origin !== `http://${host}`))
              throw Error('Same-origin loopback access required');
            if (url === '/api/study/config' && req.method === 'GET') {
              res.end(JSON.stringify({ ...manifest, consent: consentText, dryRun })); return;
            }
            if (url !== '/api/study/session' || req.method !== 'POST' || !req.headers['content-type']?.startsWith('application/json'))
              throw Error('Unsupported study request');
            let size = 0; const chunks = [];
            for await (const chunk of req) { size += chunk.length; if (size > 40e6) throw Error('Study payload too large'); chunks.push(chunk); }
            const session = sessionSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            if (session.studyId !== manifest.id || session.manifestHash !== manifestHash || session.consentVersion !== consentText ||
              session.provenance !== (dryRun ? 'simulated-dry-run' : 'human')) throw Error('Session identity/consent mismatch');
            const prior = issued.get(session.participant);
            if (prior && prior !== session.sessionId) throw Error('Participant ID already used; assign a fresh pseudonym');
            const measured = new Set();
            for (const trial of session.trials) {
              const plan = sequence(session.slot)[trial.practice ? trial.position + 4 : trial.position];
              const scenario = trial.practice ? manifest.practice : manifest.cases[plan?.caseIndex];
              if (!plan || trial.design !== plan.design || trial.caseId !== scenario.id ||
                trial.practice !== (trial.position < 0)) throw Error('Trial allocation mismatch');
              if (!trial.practice && measured.has(trial.position)) throw Error('Duplicate measured block');
              if (!trial.practice) measured.add(trial.position);
            }
            if (session.status === 'complete' && (measured.size !== 4 || session.trials.filter(t => !t.practice).some(t => !t.tlx || !t.sus)))
              throw Error('Complete sessions require four rated measured blocks');
            issued.set(session.participant, session.sessionId);
            // Immutable snapshots; never overwrite a prior export. Analysis chooses latest.
            lastStamp = Math.max(Date.now(), lastStamp + 1);
            const file = `${session.participant}--${session.sessionId}--${lastStamp}.json`;
            await writeNew(path.join(sessionsDir, file), { ...session, serverReceipt: { token, receivedAt: new Date().toISOString() } });
            res.end(JSON.stringify({ file: `runs/${manifest.id}/sessions/${file}` }));
          } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: String(error.message).slice(0,300) })); }
        });
      },
    }],
    resolve: { alias: { '@ehr/presentation': path.join(root, 'app/src/ehr/ui/presentation-helpers.tsx') } },
    define: { __LEAN_HASH__: JSON.stringify((await read(path.join(root, 'app/public/ehr/manifest.json'))).leanSourceHash) },
    server: { host: '127.0.0.1', port, strictPort: port !== 0, hmr: false,
      fs: { strict: true, allow: [root], deny: ['**/.env*', '**/.git/**', '**/runs/**', '**/fixtures/**', '**/programs/**'] } },
    logLevel: 'error',
  });
  await server.listen();
  return { server, url: `http://127.0.0.1:${server.httpServer.address().port}/study`, close: () => server.close() };
}
if (process.argv[1] === import.meta.filename) {
  const dryRun = process.argv.includes('--dry-run');
  const consent = arg('consent') ? await readFile(arg('consent'), 'utf8') : undefined;
  const study = await startStudy({ out: outputDir(arg('out')), consent, dryRun, port: Number(arg('port','5197')) });
  console.log(study.url);
}
