import { connect, createServer, type Socket } from 'node:net';
import { modelEndpoint } from './night-provider.js';
import type { EgressEvent } from './egress.js';

/** A byte forward to one loopback listener. Clients cannot select a destination. */
export async function startModelBridge(socketPath: string, baseUrl: string, log: (event: EgressEvent) => void) {
  const { host, port } = modelEndpoint(baseUrl);
  const sockets = new Set<Socket>();
  const server = createServer(client => {
    log({ host, port, allowed: true });
    const upstream = connect({ host, port });
    const close = () => { client.destroy(); upstream.destroy(); };
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on('error', close);
      socket.on('close', () => { sockets.delete(socket); close(); });
    }
    client.pipe(upstream);
    upstream.pipe(client);
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(socketPath, resolve); });
  return async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  };
}
