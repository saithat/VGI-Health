import { parentPort, workerData } from 'node:worker_threads';
import { runSuite } from './index.mjs';
try {
  const report = await runSuite({ targets: [workerData.target], binary: workerData.binary, selected: workerData.selected });
  parentPort.postMessage({ report });
} catch (e) { parentPort.postMessage({ error: e.stack ?? e.message }); }
