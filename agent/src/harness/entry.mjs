// Inside the unshared network namespace both listeners bind only to loopback.
// Each forwards bytes to its own host-controlled Unix socket.
import { connect, createServer } from 'node:net';
import { spawn } from 'node:child_process';
import process from 'node:process';

const argv = process.argv.slice(2);
const separator = argv.indexOf('--');
const [egress, port, modelSocket, modelPort] = argv.slice(0, separator);
const [command, ...args] = argv.slice(separator + 1);
if (![2, 4].includes(separator) || !command) {
  process.stderr.write('usage: entry.mjs <egress.sock> <port> [<model.sock> <port>] -- <command> [args]\n');
  process.exit(2);
}

function forward(socket, port) {
  const server = createServer(client => {
    const upstream = connect(socket);
    client.pipe(upstream); upstream.pipe(client);
    const close = () => { client.destroy(); upstream.destroy(); };
    client.on('error', close); upstream.on('error', close); client.on('close', close); upstream.on('close', close);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(Number(port), '127.0.0.1', resolve);
  });
}

await forward(egress, port);
if (modelSocket) await forward(modelSocket, modelPort);
const proxy = `http://127.0.0.1:${port}`;
const bypass = modelSocket ? '127.0.0.1' : '';
const env = { ...process.env, HTTPS_PROXY: proxy, https_proxy: proxy, HTTP_PROXY: proxy, http_proxy: proxy, ALL_PROXY: proxy, all_proxy: proxy, NO_PROXY: bypass, no_proxy: bypass };
const child = spawn(command, args, { stdio: 'inherit', env });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { process.stderr.write(`entry: ${error.message}\n`); process.exit(127); });
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 128 : 1)));
