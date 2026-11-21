// The generators use the staging directory as their data root so paths in
// manifests and clinical overlays still resolve after installation.
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { command, root, withLocalLock } from './local-build.mjs';

export async function regenerate(stage) {
  const options = { env: { ...process.env, VGI_DATA_ROOT: stage } };
  console.log('Regenerating with make synthetic-hospital (pinned sources from raw.githubusercontent.com)');
  await command('make', ['synthetic-hospital'], options).catch(error => {
    throw new Error(`make synthetic-hospital failed. It needs Python 3 and access to the pinned GitHub raw sources or their verified cache. ${error.message}`);
  });
  const java = await command('java', ['-XshowSettings:properties', '-version'], { quiet: true }).catch(() => '');
  if (!(Number(java.match(/java\.specification\.version\s*=\s*(\d+)/)?.[1]) >= 17))
    throw new Error('Synthea requires Java 17 or newer. Install a JDK, make java available on PATH and retry.');
  console.log('Regenerating Synthea patients with make synthea');
  await command('make', ['synthea'], options);
  await rename(join(stage, 'fixtures/raw'), join(stage, 'raw')); // Intermediate bundles stay in scratch.

  await withLocalLock('build', async () => {
    await command('pnpm', ['install', '--frozen-lockfile']);
    const lean = { cwd: join(root, 'lean') };
    await command('lake', ['build', 'ehr', 'Ehr.Tools.ExportContent'], lean);
    console.log('Generating world 2 and its clinical overlays');
    await command('pnpm', ['--filter', 'world', 'gen', '--seed', '1', '--days', '10', '--out', join(stage, 'runs/world/2')], options);
    console.log('Exporting core programs and P1 review screens');
    await command('lake', ['env', 'lean', '--run', 'Ehr/Tools/ExportContent.lean', stage], lean);
    await command('lake', ['env', 'lean', '--run', 'Ehr/Canonical/ReviewScreens.lean',
      join(stage, 'fixtures/synthea/Aaron_Ankunding_4966bd28.json'), join(stage, 'programs/canonical/review/P1')], lean);
  });
}
