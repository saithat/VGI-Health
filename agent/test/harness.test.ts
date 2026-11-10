import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { HarnessNightAgent, HarnessBudgetError } from '../src/harness/loop.js';
import { harnessWorkspace } from '../src/harness/workspace.js';
import { harnessSandboxArgs } from '../src/harness/sandbox.js';
import { auditLaunch, CLAUDE_ALLOWED, CLAUDE_DENIED, CLAUDE_NODE_ALLOWED, launchUsage, prepareLaunch } from '../src/harness/agents.js';
import { harnessReadme, NODE_README, workspaceHash } from '../src/harness/workspace.js';
import { UsageLimitError } from '../src/usage-limit.js';
import { pausedState, resumeSample } from '../src/quality.js';
import { DEFAULT_HARNESS_BUDGET, type HarnessBudget } from '../src/harness/stats.js';
import { llmRecordSchema } from '../src/backends/recording.js';
import { fakeCanonical, fakeSpec } from '../src/fake/fixtures.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { FAKE_PERSONAS } from '../src/fake/world.js';
import { RunStore } from '../src/store.js';
import { runNight, type LoopDeps, type NightInput } from '../src/night.js';
import { writeJson } from '../src/util.js';
import { sumMetrics } from '../src/observe.js';

const bwrap = existsSync('/usr/bin/bwrap');
const dirs: string[] = [];
async function scratch() { const dir = await mkdtemp(path.join(tmpdir(), 'harness-test-')); dirs.push(dir); return dir; }
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

async function fixture() {
  const dir = await scratch(), current = fakeCanonical('v1'), spec = fakeSpec('v1'), params = FAKE_PERSONAS[0];
  if (!params) throw new Error('Missing persona');
  const old = { ...structuredClone(current), version: 0, start: 'SECRET_OLD_PROGRAM' };
  const unused = { name: 'scripted', model: 'fixture', proposeCandidates: async () => { throw new Error('Unused'); }, chooseCandidates: async () => { throw new Error('Unused'); } };
  const deps: LoopDeps = { runId: 'fixture', store: new RunStore(dir), ehr: createFakeEhr(), screens: { mode: 'fake', check: async () => { throw new Error('Forbidden browser'); } }, agent: unused,
    seedPolicy: 'none', seedState: { injected: 0, rejected: new Set() }, worldDir: path.join(dir, 'SECRET_WORLD'), worldSeed: 1 };
  const input: NightInput = { night: 1, persona: { id: 'P1', userId: 'P1', params }, current, release: { id: 'v1', specVersion: 'v1', spec, canonical: current, notes: '', leanSpecSource: null, fake: true },
    programs: new Map([[0, old], [current.version, current]]), train: [], history: [{ night: 0, mode: 'nightly', outcome: 'SECRET_HISTORY', chosen: [], patch: [] }],
    holdout: { day: 1, validate: async () => { throw new Error('SECRET_HOLDOUT'); } } };
  const files = { 'traces.json': '[]', 'attribution.json': '[]', 'geometry.json': '[]', 'ledger.json': '[{"night":0,"id":"old","moveType":"reorder","targets":["x"],"summary":"train ledger row","trainDaySaving":null,"chosen":false,"nightOutcome":"no-change","seeded":false}]', 'locality.json': '{}' };
  const screen = current.screens[0], component = screen?.components[0];
  if (!screen || !component) throw new Error('Missing component');
  const patch = [{ op: 'replace', path: `/screens/[id=${screen.id}]/components/[id=${component.id}]/size`, from: '', valueJson: '"compact"' }];
  const candidate = (id: string) => ({ id, summary: 'Compact', moveType: 'reorder', rationale: 'less scroll', targets: [component.id], patch, predicted: { clicks: 0, keystrokes: 0, scrolls: 1, mouseTravelPx: 0, scrollPx: 10 } });
  return { dir, input, deps, bundle: { files }, patch, candidate, screen: screen.id };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
/** A shell script stands in for the model CLI; everything else (workspace, bwrap, egress, night CLI) is production code. */
function agent(f: Fixture, script: string, runDir: string, extra: { budget?: HarnessBudget; replayFrom?: string; interpreter?: 'node' } = {}) {
  return new HarnessNightAgent(f.input, f.deps, f.bundle, { harness: 'script', model: null, reasoningEffort: 'high', serviceTier: 'default', maxTurns: 10,
    script: { command: '/usr/bin/sh', args: ['-c', script] }, runDir, ...extra });
}
const ctx = (a: HarnessNightAgent, purpose: 'propose' | 'repair' = 'propose', callId = 'night-01/P1/propose-0') => ({ callId, purpose, source: purpose === 'repair' ? 'repair' as const : 'llm' as const, parts: a.toolPrompt() });
const heredoc = (file: string, value: unknown) => `cat > ${file} <<'JSON'\n${JSON.stringify(value)}\nJSON\n`;
const stdout = async (dir: string, launch = 0) => readFile(path.join(dir, 'harness', `launch-${launch}.jsonl`), 'utf8');

it('writes only the current program/spec projections and the train-only bundle into the workspace; nothing from holdout, history or earlier programs', async () => {
  const f = await fixture(), files = harnessWorkspace(f.input, f.bundle, DEFAULT_HARNESS_BUDGET);
  expect(Object.values(files).join('\n')).not.toMatch(/SECRET|holdout|worldDir|\/home\//);
  const screens = f.input.current.screens.map(s => s.id);
  expect(Object.keys(files).sort()).toEqual([
    'AGENTS.md', 'CLAUDE.md', 'README.md', 'examples/patch.json', 'examples/submission.json', 'meta.json', 'program.json',
    'queries/ledger.json', 'queries/screens.json', 'queries/sequences.json', 'queries/targets-travel.json', 'queries/targets.json',
    ...screens.map(s => `renders/${s}.json`), 'schema/submission.schema.json', 'screens.json', ...screens.map(s => `screens/${s}.json`),
    ...screens.map(s => `spec-rules/${s}.json`), 'spec.json', 'train/attribution.json', 'train/geometry.json', 'train/ledger.json', 'train/locality.json', 'train/traces.json',
  ].sort());
  expect(files['train/ledger.json']).toBe(f.bundle.files['ledger.json']);
});
it.skipIf(!bwrap)('the sandbox sees only the workspace, a private home and the read-only control directory; no sentinel reaches it', async () => {
  const f = await fixture(), a = agent(f, `ls -a / | tr '\\n' ' '; echo; grep -rl SECRET /work /home/agent /run/harness /spool /tmp; echo "grep=$?"; ls /run/harness /run/harness/bin | tr '\\n' ' '; echo; env | cut -d= -f1 | sort | tr '\\n' ' '; echo; night submit --no-change "nothing measured"`, f.dir);
  try { await a.proposeCandidates(ctx(a)); } finally { await a.close(); }
  const [root, grep, control, env] = (await stdout(f.dir)).split('\n');
  expect(root?.split(' ').filter(Boolean).sort()).toEqual(['.', '..', 'bin', 'dev', 'etc', 'home', 'lib', 'lib64', 'proc', 'run', 'sbin', 'spool', 'tmp', 'usr', 'work'].filter(d => d !== 'sbin' || existsSync('/sbin')).filter(d => d !== 'lib64' || existsSync('/lib64')).sort());
  expect(grep).toBe('grep=1');
  expect(control?.trim().split(' ').filter(Boolean).sort()).toEqual(['/run/harness/bin:', '/run/harness:', 'bin', 'egress.sock', 'entry.mjs', 'night'].sort());
  const allowed = ['ALL_PROXY', 'HOME', 'HTTPS_PROXY', 'HTTP_PROXY', 'LANG', 'NO_PROXY', 'OLDPWD', 'PATH', 'PWD', 'SHLVL', 'TMPDIR', '_', 'all_proxy', 'http_proxy', 'https_proxy', 'no_proxy'];
  expect(env?.trim().split(' ').filter(k => !allowed.includes(k))).toEqual([]);
  expect(env).not.toMatch(/ANTHROPIC|OPENAI|CODEX|CLAUDE|SSH|DBUS|XDG/);
});
it.skipIf(!bwrap)('denies writes outside the workspace, direct network and proxied egress to any host not on the allowlist', async () => {
  const f = await fixture(), outside = path.join(f.dir, 'outside.txt');
  await writeFile(outside, 'host file\n');
  const probe = `
echo x > /run/harness/x 2>/dev/null; echo "control=$?"
echo x > /usr/x 2>/dev/null; echo "usr=$?"
echo x > ${outside} 2>/dev/null; echo "host=$?"
echo x > /work/inside.txt; echo "work=$?"
node -e 'fetch("https://1.1.1.1/",{signal:AbortSignal.timeout(4000)}).then(()=>console.log("direct=open"),()=>console.log("direct=blocked"))'
node -e 'const s=require("net").connect(18443,"127.0.0.1",()=>s.write("CONNECT example.com:443 HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n"));s.on("data",d=>{console.log("proxy="+d.toString().split("\\r\\n")[0]);s.destroy();})'
night submit --no-change "probe"`;
  const a = agent(f, probe, f.dir);
  try { await a.proposeCandidates(ctx(a)); } finally { await a.close(); }
  const out = await stdout(f.dir);
  expect(out).toMatch(/control=[1-9]/); expect(out).toMatch(/usr=[1-9]/); expect(out).toMatch(/host=[1-9]/); expect(out).toContain('work=0');
  expect(out).toContain('direct=blocked'); expect(out).toContain('proxy=HTTP/1.1 403 Forbidden');
  expect(await readFile(outside, 'utf8')).toBe('host file\n');
  expect(a.stats().egress).toEqual({ allowed: 0, denied: { 'example.com': 1 } });
});
it.skipIf(!bwrap)('fails cleanly when a CLI budget is exhausted: over-quota commands exit 2, submit still works, wall time ends the decision', async () => {
  const f = await fixture(), budget = { ...DEFAULT_HARNESS_BUDGET, maxChecks: 1, maxCommands: 4 };
  const script = `${heredoc('p.json', f.patch)}
night check p.json; echo "rc=$?"
night check p.json; echo "rc=$?"
night query targets --limit 3 >/dev/null; echo "rc=$?"
night query screens >/dev/null; echo "rc=$?"
night query screens; echo "rc=$?"
night status >/dev/null; echo "rc=$?"
night submit --no-change "budget spent"; echo "rc=$?"
night submit --no-change "again"; echo "rc=$?"`;
  const a = agent(f, script, f.dir, { budget });
  try {
    const proposal = await a.proposeCandidates(ctx(a));
    expect(proposal.decision).toBe('noChange');
  } finally { await a.close(); }
  const out = await stdout(f.dir);
  expect(out.match(/rc=\d/g)).toEqual(['rc=0', 'rc=2', 'rc=0', 'rc=0', 'rc=2', 'rc=0', 'rc=0', 'rc=2']);
  expect(out).toContain('{"error":"check budget exhausted"}');
  expect(out).toContain('command budget exhausted; only night submit and night status remain');
  expect(a.stats()).toMatchObject({ checks: 1, commands: 8, submitted: true, exceeded: null, launches: 1 });
  // Wall time: the CLI process is stopped, the decision is a recorded budget error, and the ordinary loop records llm-error.
  const g = await fixture(), slow = agent(g, 'sleep 60', g.dir, { budget: { ...DEFAULT_HARNESS_BUDGET, wallMs: 2_000 } });
  g.deps.agent = slow;
  try {
    const result = await runNight(g.deps, g.input, { offline: true });
    expect(result.record.outcome).toBe('llm-error'); expect(result.record.flags.join()).toContain('wall time budget exhausted');
  } finally { await slow.close(); }
  expect(slow.stats()).toMatchObject({ exceeded: 'wall time budget exhausted', submitted: false });
  const error = llmRecordSchema.parse(JSON.parse(await readFile(path.join(g.dir, 'llm/night-01/P1/propose-0.error.json'), 'utf8')));
  expect(error.transcript).toMatchObject({ harness: { error: 'wall time budget exhausted' } });
  // An agent that exits without submitting gets one fresh continuation launch, then fails cleanly.
  const h = await fixture(), quiet = agent(h, 'night status >/dev/null', h.dir);
  try { await expect(quiet.proposeCandidates(ctx(quiet))).rejects.toThrow(HarnessBudgetError); } finally { await quiet.close(); }
  expect(quiet.stats()).toMatchObject({ launches: 2, commands: 2, exceeded: 'agent ended without night submit (launch budget exhausted)' });
});
it.skipIf(!bwrap)('re-verifies a recorded submission: same workspace, every night command re-executes to the same output, then the ordinary final gate runs', async () => {
  const f = await fixture(), rec = await scratch();
  const submission = { hypothesis: 'h', decision: 'change', candidates: [f.candidate('c1')], chosen: ['c1'], rationale: 'measured', rejected: [] };
  const script = `${heredoc('p.json', { patch: f.patch })}${heredoc('s.json', submission)}
mkdir -p notes && echo "compact first" > notes/plan.md
night render ${f.screen} >/dev/null; night query ledger >/dev/null; night check p.json; night complain "no PNG renders"; night submit s.json`;
  const first = agent(f, script, rec);
  let original;
  try { original = await first.proposeCandidates(ctx(first)); expect(await first.snapshot()).toEqual(['notes/plan.md', 'p.json', 's.json']); } finally { await first.close(); }
  expect(first.host.events.map(e => [e.request.command, e.exit])).toEqual([['render', 0], ['query', 0], ['check', 0], ['complain', 0], ['submit', 0]]);
  expect(first.host.events[2]?.output).toMatchObject({ status: 'pass' });
  expect(first.stats().complaints).toEqual(['no PNG renders']);
  expect(await readFile(path.join(rec, 'harness/workspace/notes/plan.md'), 'utf8')).toBe('compact first\n');
  const again = agent(f, 'exit 99', await scratch(), { replayFrom: rec });
  try {
    const replayed = await again.proposeCandidates(ctx(again));
    expect(replayed.candidates).toEqual(original.candidates);
    expect(again.host.events).toEqual(first.host.events);
    expect(again.launches).toEqual([]);
  } finally { await again.close(); }
  // Through runNight, the re-verified submission goes through the same independent certification.
  const g = await fixture(); const through = agent(g, 'exit 99', g.dir, { replayFrom: rec }); g.deps.agent = through;
  const metrics = (scrolls: number) => ({ ...sumMetrics([]), tasks: 1, completed: 1, clicks: 10, scrolls, scrollPx: 10 * scrolls, mouseTravelPx: 100 });
  g.input.holdout = { day: 1, validate: async () => ({ day: 1, load: 'busy', before: metrics(5), after: metrics(4), saving: { clicks: 0, keystrokes: 0, scrolls: 1, scrollPx: 10, mouseTravelPx: 0, klmDeciSec: 0 }, pctAboveFloor: { before: null, after: null } }) };
  try {
    const result = await runNight(g.deps, g.input, { offline: true });
    expect(result.record.certification.attempts.map(x => x.check.status)).toEqual(['pass']);
    expect(result.record.validation.accepted).toBe(true);
  }
  finally { await through.close(); }
  const summary = path.join(rec, 'llm/night-01/P1/propose-0.json'), changed = JSON.parse(await readFile(summary, 'utf8'));
  changed.transcript.harness.events[2].output.status = 'fail'; await writeJson(summary, changed);
  const tampered = agent(f, 'exit 99', await scratch(), { replayFrom: rec });
  try { await expect(tampered.proposeCandidates(ctx(tampered))).rejects.toThrow('re-executed differently'); } finally { await tampered.close(); }
  const other = await fixture(); other.input.current = { ...other.input.current, start: other.input.current.screens.at(-1)?.id ?? other.input.current.start };
  const moved = agent(other, 'exit 99', await scratch(), { replayFrom: rec });
  try { await expect(moved.proposeCandidates(ctx(moved))).rejects.toThrow('workspace inputs differ'); } finally { await moved.close(); }
});
it('launches each CLI with a declared, minimal capability set and never a permission bypass', async () => {
  const home = await scratch(), control = await scratch();
  const codex = await prepareLaunch({ harness: 'codex', model: 'gpt-test', reasoningEffort: 'high', serviceTier: 'default', maxTurns: 5 }, home, control, 0);
  expect(codex.args).toEqual(expect.arrayContaining(['-s', 'workspace-write', 'sandbox_workspace_write.network_access=false', 'web_search="disabled"', 'mcp_servers={}', '--ephemeral', '-C', '/work', '--add-dir', '/spool']));
  expect(codex.hosts).toEqual(['chatgpt.com', 'api.openai.com']);
  expect(await readFile(path.join(control, 'codex-requirements.toml'), 'utf8')).toContain('/home/agent/.codex/auth.json');
  await expect(prepareLaunch({ harness: 'codex', model: 'gpt-test', reasoningEffort: 'high', serviceTier: 'fast', maxTurns: 5 }, home, control, 0)).rejects.toThrow('fast mode');
  for (const a of [codex.args, CLAUDE_ALLOWED, CLAUDE_DENIED]) expect(a.join(' ')).not.toMatch(/bypass|dangerously|skip-permissions/);
  expect(CLAUDE_ALLOWED.filter(t => t.startsWith('Bash'))).toEqual(['Bash(night:*)', 'Bash(ls:*)', 'Bash(cat:*)', 'Bash(jq:*)', 'Bash(head:*)', 'Bash(wc:*)', 'Bash(grep:*)']);
  const args = harnessSandboxArgs({ workspace: home, home, control, spool: home }, '/usr/bin/true', [], {});
  expect(args).toEqual(expect.arrayContaining(['--unshare-all', '--clearenv', '--die-with-parent']));
  expect(args).not.toContain('--share-net');
  // Usage and audit parsing from recorded transcripts.
  const codexOut = [{ type: 'item.completed', item: { type: 'command_execution', command: 'night check p.json' } }, { type: 'turn.completed', usage: { input_tokens: 100, cached_input_tokens: 60, output_tokens: 7 } }].map(e => JSON.stringify(e)).join('\n');
  expect(launchUsage('codex', codexOut)).toMatchObject({ input: 100, cachedInput: 60, output: 7 });
  expect(auditLaunch('codex', codexOut)).toMatchObject({ status: 'pass', commands: 1 });
  expect(auditLaunch('codex', JSON.stringify({ type: 'item.completed', item: { type: 'mcp_tool_call' } })).status).toBe('fail');
  expect(auditLaunch('codex', JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'cat /home/agent/.codex/auth.json' } })).status).toBe('fail');
  const claudeOut = [{ type: 'assistant', message: { id: 'm1', model: 'm', usage: { input_tokens: 1, output_tokens: 2 }, content: [{ type: 'tool_use', name: 'Bash', input: { command: 'night status' } }] } },
    { type: 'result', num_turns: 3, usage: { input_tokens: 10, cache_read_input_tokens: 80, cache_creation_input_tokens: 5, output_tokens: 9 }, modelUsage: { 'model-a': {} }, permission_denials: [{}] }].map(e => JSON.stringify(e)).join('\n');
  expect(launchUsage('claude', claudeOut)).toEqual({ input: 95, cachedInput: 80, output: 9, turns: 3, servedModels: ['model-a'] });
  expect(auditLaunch('claude', claudeOut)).toMatchObject({ status: 'pass', permissionDenials: 1, commands: 1 });
  expect(auditLaunch('claude', JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'WebFetch', input: {} }] } })).status).toBe('fail');
});
it('reuses an arm only from a completed run whose frozen bindings, ledger and model options all match', async () => {
  const { reusableSamples, REUSE_BINDING_KEYS } = await import('../src/quality.js');
  const dir = await scratch();
  const binding: Record<string, unknown> = { ...Object.fromEntries(REUSE_BINDING_KEYS.map(k => [k, `v-${k}`])), agentSha256: 'old', ledgerSource: { directory: '/x', recordsSha256: 'L' },
    options: { backend: 'codex', model: 'm', reasoningEffort: 'high', serviceTier: 'default', samples: 2 } };
  await writeJson(path.join(dir, 'manifest.json'), { status: 'completed' });
  await writeJson(path.join(dir, 'inputs/binding.json'), binding);
  await writeJson(path.join(dir, 'records.json'), []);
  const opts = { runDir: '', outDir: '', arms: ['B', 'H'] as const, samples: 2, backend: 'codex' as const, workers: 1, model: 'm', reasoningEffort: 'high', serviceTier: 'default' };
  const ours = { ...binding, agentSha256: 'new' };
  await expect(reusableSamples(dir, 'B', ours, { ...opts, arms: [...opts.arms] }, [])).resolves.toMatchObject({ agentSha256: { theirs: 'old', ours: 'new' } });
  await expect(reusableSamples(dir, 'B', { ...ours, ehrSha256: 'other' }, { ...opts, arms: [...opts.arms] }, [])).rejects.toThrow('bindings differ (ehrSha256)');
  await expect(reusableSamples(dir, 'B', { ...ours, ledgerSource: { recordsSha256: 'M' } }, { ...opts, arms: [...opts.arms] }, [])).rejects.toThrow('ledgerSource');
  await expect(reusableSamples(dir, 'B', ours, { ...opts, arms: [...opts.arms], model: 'n', samples: 3 }, [])).rejects.toThrow('options.model, options.samples');
  await expect(reusableSamples(dir, 'B', ours, { ...opts, arms: [...opts.arms] }, ['night-01/P1'])).rejects.toThrow('missing night-01/P1 B/1');
});

async function claudeHome() {
  const dir = await scratch(), config = path.join(dir, 'host-claude');
  await writeFile(path.join(dir, 'claude-bin'), '');
  for (const d of [config, path.join(dir, 'home'), path.join(dir, 'control/bin')]) await mkdir(d, { recursive: true });
  await writeFile(path.join(config, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3_600_000 } }));
  return { home: path.join(dir, 'home'), control: path.join(dir, 'control'), env: { CLAUDE_CONFIG_DIR: config, CLAUDE_BIN: path.join(dir, 'claude-bin') } };
}
async function withEnv<T>(env: Record<string, string>, work: () => Promise<T>) {
  const old = Object.fromEntries(Object.keys(env).map(k => [k, process.env[k]]));
  Object.assign(process.env, env);
  try { return await work(); } finally { for (const [k, v] of Object.entries(old)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
}
it('turns Claude Code auto-memory off in the sandboxed CLI (private settings and env) and keeps the audit strict', async () => {
  const { home, control, env } = await claudeHome();
  const spec = await withEnv(env, () => prepareLaunch({ harness: 'claude', model: null, reasoningEffort: 'high', serviceTier: 'default', maxTurns: 5 }, home, control, 0));
  expect(JSON.parse(await readFile(path.join(home, '.claude/settings.json'), 'utf8'))).toEqual({ autoMemoryEnabled: false });
  expect(spec.env).toMatchObject({ CLAUDE_CONFIG_DIR: '/home/agent/.claude', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' });
  expect(spec.args).toEqual(expect.arrayContaining(['--setting-sources', 'user', '--permission-mode', 'dontAsk']));
  expect(JSON.parse(await readFile(path.join(home, '.claude/.credentials.json'), 'utf8')).claudeAiOauth.refreshToken).toBeUndefined();
  expect(existsSync(path.join(control, 'bin/node'))).toBe(false);
  // A denied memory write still fails the audit.
  const memory = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: '/home/agent/.claude/projects/-work/memory/MEMORY.md', content: 'x' } }] } });
  expect(auditLaunch('claude', memory).status).toBe('fail');
});
it('defines H-claude+node as one extra workspace-scoped allowlist entry, a node shim and a README section; the default launch is unchanged', async () => {
  const { home, control, env } = await claudeHome();
  const cfg = { harness: 'claude' as const, model: null, reasoningEffort: 'high', serviceTier: 'default', maxTurns: 5 };
  const plain = await withEnv(env, () => prepareLaunch(cfg, home, control, 0));
  const node = await withEnv(env, () => prepareLaunch({ ...cfg, interpreter: 'node' }, home, control, 0));
  const allowed = (args: string[]) => args.slice(args.indexOf('--allowedTools') + 1, args.indexOf('--disallowedTools'));
  expect(allowed(plain.args)).toEqual(CLAUDE_ALLOWED);
  expect(allowed(node.args)).toEqual([...CLAUDE_ALLOWED, 'Bash(node /work/*)']);
  expect(CLAUDE_NODE_ALLOWED).toBe('Bash(node /work/*)');
  expect(node.args.filter(a => !allowed(node.args).includes(a))).toEqual(plain.args.filter(a => !allowed(plain.args).includes(a)));
  expect({ ...node, args: [] }).toEqual({ ...plain, args: [] });
  expect(await readFile(path.join(control, 'bin/node'), 'utf8')).toContain('--permission --allow-fs-read=/work --allow-fs-read=/tmp --allow-fs-write=/work --allow-fs-write=/tmp');
  await withEnv(env, () => prepareLaunch(cfg, home, control, 1));
  expect(existsSync(path.join(control, 'bin/node'))).toBe(false);
  await expect(prepareLaunch({ ...cfg, harness: 'codex', model: 'm', interpreter: 'node' }, home, control, 0)).rejects.toThrow('claude harness only');
  // Workspace: only README.md differs, by the appended node section.
  const f = await fixture(), a = harnessWorkspace(f.input, f.bundle, DEFAULT_HARNESS_BUDGET), b = harnessWorkspace(f.input, f.bundle, DEFAULT_HARNESS_BUDGET, 'node');
  expect(a['README.md']).toBe(harnessReadme(DEFAULT_HARNESS_BUDGET));
  expect(b['README.md']).toBe(harnessReadme(DEFAULT_HARNESS_BUDGET) + NODE_README);
  expect({ ...b, 'README.md': '' }).toEqual({ ...a, 'README.md': '' });
  expect(workspaceHash(a)).not.toBe(workspaceHash(b));
});
it.skipIf(!bwrap)('the node shim runs only regular files under /work, with reads and writes confined to /work and /tmp', async () => {
  const f = await fixture();
  const script = `printf '%s\n' 'import fs from "node:fs"; fs.writeFileSync("/work/out.txt", fs.readFileSync("/work/program.json", "utf8").slice(0, 1)); console.log("ok", process.argv.slice(2).join(","));' > /work/ok.mjs
printf '%s\n' 'try { require("fs").readdirSync("/home/agent"); console.log("home=open"); } catch (e) { console.log("home=" + e.code); }' > /work/home.js
printf '%s\n' 'try { require("child_process").execSync("true"); console.log("spawn=open"); } catch (e) { console.log("spawn=" + e.code); }' > /work/spawn.js
printf '%s\n' 'console.log("ran outside")' > /tmp/outside.js
mkdir -p /work/d && ln -s /tmp/outside.js /work/d/link.js
node /work/ok.mjs a b; echo "rc=$?"
node /work/home.js; echo "rc=$?"
NODE_OPTIONS=--allow-fs-read=/ node /work/home.js; echo "rc=$?"
node /work/spawn.js; echo "rc=$?"
node /work/../tmp/outside.js; echo "rc=$?"
node /work/d/link.js; echo "rc=$?"
node /work/d; echo "rc=$?"
node -e 1; echo "rc=$?"
cat /work/out.txt; echo
night submit --no-change "probe"`;
  const a = agent(f, script, f.dir, { interpreter: 'node' });
  try { await a.proposeCandidates(ctx(a)); } finally { await a.close(); }
  const out = await stdout(f.dir);
  expect(out.match(/rc=\d+/g)).toEqual(['rc=0', 'rc=0', 'rc=0', 'rc=0', 'rc=126', 'rc=126', 'rc=126', 'rc=126']);
  expect(out).toContain('ok a,b'); expect(out.match(/home=ERR_ACCESS_DENIED/g)).toHaveLength(2); expect(out).toContain('spawn=ERR_ACCESS_DENIED');
  expect(out).not.toContain('ran outside'); expect(out).not.toMatch(/home=open|spawn=open/);
  expect(out).toContain('\n{\n');
  expect(a.stats()).toMatchObject({ interpreter: 'node', submitted: true });
});
const CLAUDE_LIMIT = [{ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1794255600, rateLimitType: 'five_hour' } },
  { type: 'assistant', message: { id: 'm', model: '<synthetic>', usage: { input_tokens: 0, output_tokens: 0 }, content: [{ type: 'text', text: "You've hit your 5-hour limit" }] }, error: 'rate_limit', api_error_status: 429, api_error: 'usage_limit_reached' },
  { type: 'result', is_error: true, num_turns: 1, usage: { input_tokens: 0, output_tokens: 0 }, api_error_status: 429, api_error: 'usage_limit_reached', result: "You've hit your 5-hour limit" }];
const CODEX_LIMIT = [{ type: 'thread.started', thread_id: 't' }, { type: 'turn.started' },
  { type: 'error', message: "You've hit your usage limit. Visit https://chatgpt.com/settings/usage to purchase more credits or try again later." },
  { type: 'turn.failed', error: { message: "You've hit your usage limit." } }];
const emit = (events: unknown[]) => `cat <<'JSON'\n${events.map(e => JSON.stringify(e)).join('\n')}\nJSON\n`;
it.skipIf(!bwrap)('a CLI usage limit aborts the sample as a resumable infrastructure error: no continuation, no llm-error record, resume reruns only that sample', async () => {
  for (const events of [CLAUDE_LIMIT, CODEX_LIMIT]) {
    // A fake CLI that does some work, then is refused by the model API, exactly as the real CLIs report it.
    const f = await fixture(), a = agent(f, `night status >/dev/null\n${emit(events)}exit 1`, f.dir);
    f.deps.agent = a;
    try { await expect(runNight(f.deps, f.input, { offline: true })).rejects.toThrow(UsageLimitError); } finally { await a.close(); }
    expect(a.stats()).toMatchObject({ launches: 1, submitted: false, exceeded: null });
    expect(a.launches[0]?.usageLimit).toMatchObject({ cli: events === CLAUDE_LIMIT ? 'claude' : 'codex' });
    expect(existsSync(path.join(f.dir, 'llm/night-01/P1/propose-0.error.json'))).toBe(true);
  }
  // A launch that submitted before a refusal keeps its result.
  const g = await fixture(), done = agent(g, `night submit --no-change "measured nothing"\n${emit(CLAUDE_LIMIT)}`, g.dir);
  try { expect((await done.proposeCandidates(ctx(done))).decision).toBe('noChange'); } finally { await done.close(); }
  // The quality run pauses; --resume keeps finished samples and moves the refused one aside to rerun it.
  const out = await scratch(), finished = path.join(out, 'samples/night-01/P1/H/1'), refused = path.join(out, 'samples/night-02/P2/H/1');
  await writeJson(path.join(finished, 'record.json'), { recorded: true });
  await writeJson(path.join(refused, 'harness/launch-0.json'), { usageLimit: { cli: 'claude' } });
  const pause = await pausedState(out, new UsageLimitError({ cli: 'claude', message: 'limit', resetsAt: '2026-11-09T20:20:00.000Z' }), ['night-01/P1', 'night-02/P2'], ['H'], 1);
  expect(pause).toMatchObject({ kind: 'usage-limit', cli: 'claude', resetsAt: '2026-11-09T20:20:00.000Z', pending: ['night-02/P2/H/1'] });
  expect(await resumeSample(refused)).toBeNull();
  expect(existsSync(refused)).toBe(false); expect(existsSync(`${refused}.partial-1/harness/launch-0.json`)).toBe(true);
  // A finished sample is read back as recorded (here an invalid record fails validation) and never moved.
  await expect(resumeSample(finished)).rejects.toThrow(); expect(existsSync(path.join(finished, 'record.json'))).toBe(true);
});
