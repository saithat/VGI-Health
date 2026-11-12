import { Fault, adtCommandInput, clinicalPersona, commandInput, cosignInput, encounterInput, eventInput, required, sessionInput, checkpointInput, renewInput, version } from './types.ts';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { AdtStore } from './adt.ts';
import { authenticator } from './auth.ts';
import { EventEmitter } from 'node:events';
import pg from 'pg';
import { z } from 'zod';
import { Store } from './store.ts';

/** LISTEN is a latency hint. Durable version reads plus periodic catch-up cover
 * disconnects, coalesced notifications and the LISTEN/snapshot startup race. */
export class Notifications extends EventEmitter {
  private client?: pg.Client;
  private closed = false;
  private timer?: NodeJS.Timeout;
  private url: string;
  constructor(url: string) { super(); this.url = url; this.setMaxListeners(0); }
  async start() {
    if (this.closed) return;
    const client = new pg.Client({ connectionString: this.url, connectionTimeoutMillis: 5000 });
    this.client = client;
    let failed = false;
    const retry = () => {
      if (failed || this.closed) return;
      failed = true;
      void client.end().catch(() => {});
      this.emit('wake');
      this.timer = setTimeout(() => { void this.start(); }, 1000);
    };
    client.on('error', retry);
    client.on('end', retry);
    client.on('notification', () => this.emit('wake'));
    try { await client.connect(); await client.query('LISTEN vgi_commit'); this.emit('wake'); }
    catch { retry(); }
  }
  async close() { this.closed = true; clearTimeout(this.timer); await this.client?.end().catch(() => {}); }
}
function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 64 * 1024) throw new Fault(413, 'body_too_large');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Fault(400, 'invalid_json'); }
}
function cursor(value: string | null | undefined) {
  const text = value ?? '0';
  if (!/^\d+$/.test(text)) throw new Fault(400, 'invalid_cursor');
  return version.parse(Number(text));
}
export function server(store: Store, notifications: Notifications) {
  const adt = new AdtStore(store);
  const streams = new Set<ServerResponse>();
  const authenticate = authenticator(store.config);
  const http = createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        await store.db.query('SELECT 1');
        await store.lean.call('multi-step', { state: { administrations: [], placements: [] }, action: { assignBed: { actor: 0, patient: 0, bed: 0 } } });
        return json(res, 200, { status: 'ok' });
      }
      const actor = await authenticate(req.headers.authorization);
      const url = new URL(required(req.url), 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (req.method === 'POST' && url.pathname === '/encounters') {
        const result = await store.openEncounter(actor, encounterInput.parse(await body(req)));
        return json(res, result.status, result.body);
      }
      if (req.method === 'GET' && url.pathname === '/release') {
        if (url.searchParams.has('persona') && url.searchParams.get('persona') !== clinicalPersona(actor)) throw new Fault(403, 'release_forbidden');
        const name = clinicalPersona(actor);
        const release = store.config.releases[url.searchParams.get('baseline') === '1' && store.config.releases[`${name}-baseline`] ? `${name}-baseline` : name];
        if (!release) throw new Fault(404, 'release_not_found');
        return json(res, 200, { spec: release.spec, program: release.program });
      }
      if (req.method === 'GET' && url.pathname === '/directory') return json(res, 200, await store.directory(actor));
      if (req.method === 'GET' && url.pathname === '/me') return json(res, 200, { user: actor.user, persona: actor.persona, name: actor.name, adtRoles: actor.adtRoles, units: actor.units });
      if (req.method === 'GET' && url.pathname === '/adt/board') return json(res, 200, await adt.read(actor));
      if (req.method === 'POST' && url.pathname === '/adt/commands') {
        const result = await adt.submit(actor, adtCommandInput.parse(await body(req)));
        return json(res, result.status, result.body);
      }
      if (req.method === 'GET' && url.pathname === '/adt/events') {
        const initial = await adt.read(actor);
        let after = z.string().optional().parse(req.headers['last-event-id']) ?? url.searchParams.get('after') ?? '';
        if (after && !/^[a-f0-9]{64}$/.test(after)) throw new Fault(400, 'invalid_cursor');
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.flushHeaders();
        streams.add(res);
        let stopped = false, running = false, dirty = false;
        const stop = () => { if (stopped) return; stopped = true; clearInterval(timer); notifications.off('wake', wake); streams.delete(res); res.end(); };
        const pump = async () => {
          if (running || stopped) return;
          running = true;
          try {
            do {
              dirty = false;
              if (actor.expires && Date.now() >= actor.expires * 1000) { stop(); break; }
              const board = await adt.read(actor);
              if (after !== board.cursor) {
                after = board.cursor;
                if (!res.write(`id: ${after}\nevent: board\ndata: ${JSON.stringify(board)}\n\n`)) stop();
              }
            } while (dirty && !stopped);
          } catch { stop(); } finally { running = false; }
        };
        const wake = () => { dirty = true; void pump(); };
        const timer = setInterval(() => { if (!res.write(': keepalive\n\n')) stop(); else wake(); }, 2000);
        notifications.on('wake', wake);
        res.on('close', stop);
        // Subscribe before catch-up; initial is authorization/preflight only.
        void initial;
        wake();
        return;
      }
      if (req.method === 'POST' && url.pathname === '/mar/cosigns') return json(res, 201, await store.cosign(actor, cosignInput.parse(await body(req))));
      if (req.method === 'GET' && url.pathname === '/mar') return json(res, 200, await store.marDirectory(actor));
      if (req.method === 'GET' && parts[0] === 'requests' && parts.length === 2) {
        return json(res, 200, await store.outcome(actor, parts[1]));
      }
      if (req.method === 'GET' && parts[0] === 'patients' && parts.length === 3 && parts[2] === 'chart') {
        const current = await store.read(actor, parts[1], 2147483646);
        return json(res, 200, { version: current.version, snapshot: { bundle: current.snapshot.bundle, context: current.snapshot.context }, adt: current.snapshot.adt });
      }
      if (req.method === 'GET' && parts[0] === 'patients' && parts.length === 6 && parts[2] === 'resources') {
        const resource = await store.resource(actor, parts[1], parts[3], parts[4], parts[5]);
        return json(res, 200, resource);
      }
      if (req.method === 'POST' && url.pathname === '/sessions') {
        return json(res, 201, await store.openSession(actor, sessionInput.parse(await body(req))));
      }
      if (req.method === 'POST' && url.pathname === '/draft-checkpoints') {
        return json(res, 201, await store.checkpoint(actor, checkpointInput.parse(await body(req))));
      }
      if (req.method === 'POST' && parts[0] === 'sessions' && parts.length === 3 && parts[2] === 'renew') {
        return json(res, 201, await store.renewSession(actor, z.uuid().parse(parts[1]), renewInput.parse(await body(req)).revision));
      }
      if (req.method === 'POST' && parts[0] === 'sessions' && parts.length === 3 && parts[2] === 'events') {
        const id = z.uuid().parse(parts[1]);
        return json(res, 200, await store.event(actor, id, eventInput.parse(await body(req))));
      }
      if (req.method === 'POST' && url.pathname === '/commands') {
        const result = await store.submit(actor, commandInput.parse(await body(req)));
        return json(res, result.status, result.body);
      }
      if (req.method === 'GET' && parts[0] === 'patients' && parts.length === 2) {
        return json(res, 200, await store.read(actor, parts[1], cursor(url.searchParams.get('after'))));
      }
      if (req.method === 'GET' && parts[0] === 'patients' && parts.length === 3 && parts[2] === 'events') {
        const patient = parts[1];
        let after = cursor(z.string().optional().parse(req.headers['last-event-id']) ?? url.searchParams.get('after'));
        const initial = await store.read(actor, patient, after);
        if (after > initial.version) throw new Fault(409, 'cursor_ahead');
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.flushHeaders();
        streams.add(res);
        let running = false;
        let dirty = false;
        let stopped = false;
        const stop = () => {
          stopped = true;
          clearInterval(timer);
          notifications.off('wake', wake);
          streams.delete(res);
          res.end();
        };
        const pump = async () => {
          if (running || stopped) return;
          running = true;
          try {
            do {
              dirty = false;
              if (actor.expires && Date.now() >= actor.expires * 1000) { stop(); break; }
              const read = await store.read(actor, patient, after);
              if (read.events.length === 128) dirty = true;
              for (const e of read.events) {
                if (stopped) break;
                if (!res.write(`id: ${e.version}\nevent: commit\ndata: ${JSON.stringify(e)}\n\n`)) {
                  // Bound memory for slow readers. Event is durable; resume from
                  // the last ID actually received, even if this write was queued.
                  stop(); break;
                }
                after = e.version;
              }
            } while (dirty && !stopped);
          } catch { stop(); }
          finally { running = false; }
        };
        const wake = () => { dirty = true; void pump(); };
        const timer = setInterval(() => { if (!res.write(': keepalive\n\n')) stop(); else wake(); }, 2000);
        notifications.on('wake', wake);
        res.on('close', stop);
        wake();
        return;
      }
      throw new Fault(404, 'not_found');
    } catch (e) {
      if (res.headersSent) { res.end(); return; }
      if (e instanceof Fault) json(res, e.status, { error: e.code });
      else if (e instanceof z.ZodError || e instanceof URIError) json(res, 400, { error: 'invalid_request' });
      else json(res, 503, { error: 'temporarily_unavailable', retry: 'Retry the identical command and requestId; its outcome may already be durable.' });
    }
  });
  http.requestTimeout = 30_000;
  http.headersTimeout = 10_000;
  return { http, close: async () => {
    for (const res of streams) res.end();
    await new Promise<void>((resolve, reject) => http.close(e => e ? reject(e) : resolve()));
  } };
}
