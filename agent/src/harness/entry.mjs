// Runs as PID 1's child inside the arm H bwrap sandbox. The sandbox network
// namespace has only loopback; this forwards 127.0.0.1:<port> to the host's
// allowlisted CONNECT proxy over a bind-mounted Unix socket, then runs the agent.
import { connect, createServer } from 'node:net';
import { spawn } from 'node:child_process';
import process from 'node:process';
const [egress, portText, sep, command, ...args] = process.argv.slice(2);
if (!egress || !portText || sep !== '--' || !command) { process.stderr.write('usage: entry.mjs <egress.sock> <port> -- <command> [args]\n'); process.exit(2); }
const port = Number(portText);
const server = createServer(client => {
  const upstream = connect(egress);
  client.pipe(upstream); upstream.pipe(client);
  const close = () => { client.destroy(); upstream.destroy(); };
  client.on('error', close); upstream.on('error', close); client.on('close', close); upstream.on('close', close);
});
server.listen(port, '127.0.0.1', () => {
  const proxy = `http://127.0.0.1:${port}`;
  const env = { ...process.env, HTTPS_PROXY: proxy, https_proxy: proxy, HTTP_PROXY: proxy, http_proxy: proxy, ALL_PROXY: proxy, all_proxy: proxy, NO_PROXY: '', no_proxy: '' };
  const child = spawn(command, args, { stdio: 'inherit', env });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
  child.on('error', error => { process.stderr.write(`entry: ${error.message}\n`); process.exit(127); });
  child.on('exit', (code, signal) => { server.close(); process.exit(code ?? (signal ? 128 : 1)); });
});
