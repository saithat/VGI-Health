import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { HarnessNightAgent, HarnessBudgetError } from '../src/harness/loop.js';
import { harnessWorkspace } from '../src/harness/workspace.js';
import { harnessSandboxArgs } from '../src/harness/sandbox.js';
import { auditLaunch, CLAUDE_ALLOWED, CLAUDE_DENIED, launchUsage, prepareLaunch } from '../src/harness/agents.js';
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
function agent(f: Fixture, script: string, runDir: string, extra: { budget?: HarnessBudget; replayFrom?: string } = {}) {
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
  const f = await fixture(), a = agent(f, `ls -a / | tr '\\n' ' '; echo; grep -rl SECRET /work /home/agent /run/harness /tmp; echo "grep=$?"; ls /run/harness /run/harness/bin | tr '\\n' ' '; echo; env | cut -d= -f1 | sort | tr '\\n' ' '; echo; night submit --no-change "nothing measured"`, f.dir);
  try { await a.proposeCandidates(ctx(a)); } finally { await a.close(); }
  const [root, grep, control, env] = (await stdout(f.dir)).split('\n');
  expect(root?.split(' ').filter(Boolean).sort()).toEqual(['.', '..', 'bin', 'dev', 'etc', 'home', 'lib', 'lib64', 'proc', 'run', 'sbin', 'tmp', 'usr', 'work'].filter(d => d !== 'sbin' || existsSync('/sbin')).filter(d => d !== 'lib64' || existsSync('/lib64')).sort());
  expect(grep).toBe('grep=1');
  expect(control?.trim().split(' ').filter(Boolean).sort()).toEqual(['/run/harness/bin:', '/run/harness:', 'bin', 'egress.sock', 'entry.mjs', 'night', 'night.sock'].sort());
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
  expect(codex.args).toEqual(expect.arrayContaining(['-s', 'workspace-write', 'sandbox_workspace_write.network_access=false', 'web_search="disabled"', 'mcp_servers={}', '--ephemeral', '-C', '/work']));
  expect(codex.hosts).toEqual(['chatgpt.com', 'api.openai.com']);
  expect(await readFile(path.join(control, 'codex-requirements.toml'), 'utf8')).toContain('/home/agent/.codex/auth.json');
  await expect(prepareLaunch({ harness: 'codex', model: 'gpt-test', reasoningEffort: 'high', serviceTier: 'fast', maxTurns: 5 }, home, control, 0)).rejects.toThrow('fast mode');
  for (const a of [codex.args, CLAUDE_ALLOWED, CLAUDE_DENIED]) expect(a.join(' ')).not.toMatch(/bypass|dangerously|skip-permissions/);
  expect(CLAUDE_ALLOWED.filter(t => t.startsWith('Bash'))).toEqual(['Bash(night:*)', 'Bash(ls:*)', 'Bash(cat:*)', 'Bash(jq:*)', 'Bash(head:*)', 'Bash(wc:*)', 'Bash(grep:*)']);
  const args = harnessSandboxArgs({ workspace: home, home, control }, '/usr/bin/true', [], {});
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
