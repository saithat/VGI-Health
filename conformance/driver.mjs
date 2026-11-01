export class Failure extends Error {}
export const assert = (condition, message) => { if (!condition) throw new Failure(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const action = c => c.kind?.button?.action;
export const field = (element, slot) => c => c.kind?.field?.element === element &&
  (slot === undefined || c.kind.field.slot === 'current' || c.kind.field.slot.fixed?.n === slot);
export const commit = id => c => action(c)?.commit?.commit === id;
export const info = id => c => ['panel', 'table', 'trend', 'priorAuth'].some(k => c.kind?.[k]?.info === id);
export const alert = id => c => c.kind?.alert?.alert === id;

/** Scenario code passes semantic predicates, never component/screen IDs. IDs
 * are bound here, from the actual revision, only when emitting native events. */
export class Driver {
  constructor(native, spec, program, facts, user = { id: program.owner, role: program.role }) {
    this.native = native;
    this.input = { spec, program, facts, user };
    this.state = native.call('init', this.input);
    this.trace = [];
    native.lastDriver = this;
  }
  get program() { return this.input.program; }
  get facts() { return this.input.facts; }
  get view() { return this.native.call('view', { ...this.input, state: this.state }); }
  get screen() { return this.program.screens.find(s => s.id === this.state.screen); }
  capture(element, slot) { return this.state.captured.find(x => x.element === element && (slot === undefined || x.slot === slot)); }
  step(event, intent) {
    this.native.lastDriver = this;
    const out = this.native.call('step', { ...this.input, state: this.state, event });
    this.state = out.state;
    this.trace.push({ intent, event, result: out.result, screen: this.state.screen,
      commits: this.state.commits, popup: this.state.popup ?? null });
    return out.result;
  }
  route(target) {
    const queue = [[this.state.screen, []]], visited = new Set();
    while (queue.length) {
      const [id, path] = queue.shift();
      if (id === target) return path;
      if (visited.has(id)) continue;
      visited.add(id);
      const screen = this.program.screens.find(s => s.id === id);
      for (const c of screen?.components ?? []) {
        const next = action(c)?.goto?.screen;
        if (next && !visited.has(next)) queue.push([next, [...path, c]]);
      }
    }
    return null;
  }
  reveal(c, seen = new Set()) {
    if (this.view.items.some(i => i.comp.id === c.id && i.shown)) return true;
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    if (c.parent) {
      const p = this.screen.components.find(x => x.id === c.parent);
      if (!p || !this.reveal(p, seen)) return false;
      const item = this.view.items.find(i => i.comp.id === p.id);
      if (p.kind?.group?.collapsible && !item.expanded) this.step({ click: { comp: p.id } }, 'expand ancestor');
      if (p.kind === 'tabs' && item.selectedTab !== c.tab) this.step({ selectTab: { comp: p.id, idx: c.tab } }, 'select ancestor tab');
    }
    return this.view.items.some(i => i.comp.id === c.id && i.shown);
  }
  find(predicate, description, { workflow, optional = false } = {}) {
    const candidates = this.program.screens.flatMap(s => s.components.filter(predicate).map(c => ({ s, c, route: this.route(s.id) })))
      .filter(x => x.route !== null)
      .sort((a, b) => Number(b.s.workflow === workflow) - Number(a.s.workflow === workflow) || a.route.length - b.route.length);
    for (const { s, c } of candidates) {
      const path = this.route(s.id);
      let reached = true;
      for (const navigation of path) {
        if (!this.reveal(navigation)) { reached = false; break; }
        const result = this.step({ click: { comp: navigation.id } }, `navigate toward ${description}`);
        if (result !== 'ok') { reached = false; break; }
      }
      if (reached && this.reveal(c)) return c;
    }
    if (optional) return null;
    throw new Failure(`Workflow impossible: no reachable shown control for ${description}`);
  }
  enter(element, value, options = {}) {
    const c = this.find(field(element, options.slot), `element ${element}`, options);
    const result = this.step({ enter: { comp: c.id, value } }, `enter ${element}`);
    if (!options.refusal) assert(result === 'ok', `Entry ${element} refused: ${JSON.stringify(result)}`);
    return result;
  }
  atCommit(id, options = {}) { return this.find(commit(id), `commit ${id}`, options); }
  clickCommit(id, options = {}) {
    const c = this.atCommit(id, options);
    return this.step({ click: { comp: c.id } }, `attempt ${id}`);
  }
  finish(id, options = {}) {
    const seen = new Set();
    for (let n = 0; n < 40; n++) {
      if (this.state.commits.includes(id)) return;
      if (this.state.popup) {
        const popup = this.state.popup;
        const key = JSON.stringify(popup);
        assert(!seen.has(key), `Repeated interruption ${key}`);
        seen.add(key);
        this.step({ ack: { alert: popup[0] } }, 'human acknowledgement');
      } else {
        const result = this.clickCommit(id, options);
        assert(result === 'ok' || this.state.popup, `Legitimate ${id} blocked: ${JSON.stringify(result)}`);
      }
    }
    throw new Failure(`Legitimate ${id} did not complete`);
  }
  /** Fork only to compare alternative human attempts from an identical reachable
   * prefix. No scenario fabricates captured values, acknowledgements or commits. */
  fork() {
    const d = Object.create(Driver.prototype);
    d.native = this.native; d.input = structuredClone(this.input);
    d.state = structuredClone(this.state); d.trace = structuredClone(this.trace);
    return d;
  }
  assertCaptured(element, value, slot) {
    const captured = this.capture(element, slot);
    assert(captured?.confirmed && same(captured.value, value), `${element} not confirmed with expected value`);
  }
}
