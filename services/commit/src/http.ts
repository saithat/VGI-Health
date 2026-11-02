import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { EventEmitter } from 'node:events';
import pg from 'pg';
import { z } from 'zod';
import { Store } from './store.ts';
import { exportFhir } from './fhir.ts';
import { Fault, commandInput, eventInput, sessionInput, version, type Actor } from './types.ts';

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
function authenticate(store: Store, req: IncomingMessage): Actor {
  const supplied = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
  const hash = createHash('sha256').update(supplied).digest();
  const actor = store.config.actors.find(a => timingSafeEqual(hash, createHash('sha256').update(a.token).digest()));
  if (!actor) throw new Fault(401, 'unauthorized');
  return actor;
}
function cursor(value: string | null | undefined) {
  const text = value ?? '0';
  if (!/^\d+$/.test(text)) throw new Fault(400, 'invalid_cursor');
  return version.parse(Number(text));
}
export function server(store: Store, notifications: Notifications) {
  const streams = new Set<ServerResponse>();
  const http = createServer(async (req, res) => {
    try {
      const actor = authenticate(store, req);
      const url = new URL(req.url!, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (req.method === 'GET' && parts[0] === 'requests' && parts.length === 2) {
        return json(res, 200, await store.outcome(actor, parts[1]));
      }
      if (req.method === 'GET' && parts[0] === 'patients' && parts.length === 3 && parts[2] === 'fhir') {
        const snapshot = await store.read(actor, parts[1]);
        const events = [...snapshot.events];
        let after = events.at(-1)?.version ?? 0;
        while (after < snapshot.version) {
          const batch = await store.read(actor, parts[1], after);
          const within = batch.events.filter((e: { version: number }) => e.version <= snapshot.version);
          if (!within.length) throw new Error('Incomplete export history');
          events.push(...within); after = events.at(-1)!.version;
        }
        return json(res, 200, exportFhir(parts[1], snapshot, events));
      }
      if (req.method === 'POST' && url.pathname === '/sessions') {
        return json(res, 201, await store.openSession(actor, sessionInput.parse(await body(req))));
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
        let after = cursor(req.headers['last-event-id'] as string | undefined ?? url.searchParams.get('after'));
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
