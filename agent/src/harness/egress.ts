/** Host-side egress for arm H: an HTTP CONNECT proxy on a private Unix socket that
 * opens TLS tunnels only to an exact host allowlist on port 443. The sandbox has no
 * network namespace of its own beyond loopback; this socket is its only way out. */
import { connect, createServer, type Socket } from 'node:net';

export interface EgressEvent { host: string; port: number; allowed: boolean }
/** Model API endpoints each CLI needs. Nothing else is reachable. */
const NONE: readonly string[] = [];
export const EGRESS_HOSTS: Readonly<Record<'codex' | 'claude' | 'script', readonly string[]>> = {
  codex: ['chatgpt.com', 'api.openai.com'],
  claude: ['api.anthropic.com'],
  script: NONE,
};

export async function startEgressProxy(socketPath: string, allow: readonly string[], log: (event: EgressEvent) => void) {
  const sockets = new Set<Socket>();
  const server = createServer(client => {
    sockets.add(client); client.on('close', () => sockets.delete(client)); client.on('error', () => client.destroy());
    let head = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      head = Buffer.concat([head, chunk]);
      const end = head.indexOf('\r\n\r\n');
      if (end < 0) { if (head.length > 16_384) client.destroy(); return; }
      client.off('data', onData);
      const line = head.subarray(0, end).toString('latin1').split('\r\n')[0] ?? '';
      const match = /^CONNECT ([A-Za-z0-9.-]+):(\d+) HTTP\/1\.[01]$/.exec(line);
      const host = match?.[1]?.toLowerCase() ?? line.slice(0, 200), port = Number(match?.[2] ?? 0);
      const allowed = Boolean(match) && port === 443 && allow.includes(host);
      log({ host, port, allowed });
      if (!allowed) { client.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'); return; }
      const upstream = connect({ host, port });
      sockets.add(upstream); upstream.on('close', () => sockets.delete(upstream));
      upstream.once('connect', () => {
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        const rest = head.subarray(end + 4);
        if (rest.length) upstream.write(rest);
        client.pipe(upstream); upstream.pipe(client);
      });
      upstream.on('error', () => { if (!client.destroyed) client.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n'); });
      client.on('close', () => upstream.destroy());
    };
    client.on('data', onData);
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(socketPath, resolve); });
  return async () => { for (const s of sockets) s.destroy(); await new Promise<void>(resolve => server.close(() => resolve())); };
}
