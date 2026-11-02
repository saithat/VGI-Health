import { selectionFacts, emptyDisplay, nodes } from './workspace.mjs';
export class Failure extends Error {
  constructor(message, classification = 'rule-conformance') { super(message); this.classification = classification; }
}
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
  constructor(native, spec, program, facts, user = { id: program.owner, role: program.role }, { autoOpen = true } = {}) {
    this.native = native;
    this.input = { spec, program, facts: program.patientSelection ? selectionFacts(facts) : facts, user };
    this.state = native.call('init', this.input);
    this.trace = [];
    this.selectionTrace = [];
    this.hydrationTrace = [];
    native.lastDriver = this;
    if (program.patientSelection && autoOpen) this.openPatient(this.facts.sourcePatientId);
  }
  get program() { return this.input.program; }
  get facts() { return this.input.facts; }
  get view() { return this.native.call('view', { ...this.input, state: this.state }); }
  get screen() { return this.program.screens.find(s => s.id === this.state.screen); }
  capture(element, slot) { return this.state.captured.find(x => x.element === element && (slot === undefined || x.slot === slot)); }
  get selectionMode() { return this.program.patientSelection ? 'in-ui-selection' : 'legacy-preselected'; }
  render(display = emptyDisplay) { return this.native.call('render-ui', { ...this.input, state: this.state, display }); }
  workspaceNavigation(label) {
    return this.render().nav.flatMap(([, controls]) => controls).find(([, title]) => label instanceof RegExp ? label.test(title) : title === label)?.[0];
  }
  returnToLanding() {
    const control = this.workspaceNavigation(/^Return to /);
    if (!control) throw new Failure('could not open patient: no return-to-list control', 'could-not-open-patient');
    assert(this.step({ click: { comp: control } }, 'return to patient list', 'selection') === 'ok', 'Return to patient list refused');
  }
  lookup(query) {
    const control = this.workspaceNavigation('Patient Lookup');
    if (control) assert(this.step({ click: { comp: control } }, 'open Patient Lookup', 'selection') === 'ok', 'Patient Lookup refused');
    const search = nodes(this.render(), 'field').find(f => f.kind === 'search' && /name.*MRN/i.test(f.label));
    if (!search) throw new Failure('could not open patient: no Patient Lookup search control', 'could-not-open-patient');
    assert(this.step({ enter: { comp: search.comp, value: { text: { s: query } } } }, `find patient by ${query}`, 'selection') === 'ok', 'Patient search refused');
  }
  patientControl(id) {
    // The workspace transport embeds the semantic patient identity; consume an
    // actual shown row action rather than inventing a component identifier.
    return nodes(this.render(), 'button').find(b => b.enabled && b.comp.startsWith('workspace.open|') && b.comp.split('|')[1] === id)?.comp;
  }
  openPatient(id, { bind = true } = {}) {
    if (this.state.patientContext?.patient) this.returnToLanding();
    let control = this.patientControl(id);
    if (!control) {
      const patient = this.facts.patientDirectory?.patients.find(p => p.id === id);
      this.lookup(patient?.mrn || patient?.name || id);
      control = this.patientControl(id);
    }
    if (!control) throw new Failure(`could not open patient ${id}: neither landing row nor Patient Lookup result exists`, 'could-not-open-patient');
    assert(this.step({ click: { comp: control } }, `open patient ${id}`, 'selection') === 'ok', `could not open patient ${id}: row action refused`);
    assert(this.state.patientContext?.patient === id, `could not open patient ${id}: selection did not change`);
    if (bind) this.hydrate(this.facts);
  }
  hydrate(facts) {
    this.input.facts = selectionFacts(facts);
    this.step({ scroll: { screen: this.state.screen } }, 'host binds selected patient source', 'hydration');
    assert(this.state.patientContext?.bound === this.state.patientContext?.patient &&
      this.state.patientContext?.bound === this.facts.sourcePatientId, 'Selected patient chart did not bind to its source');
  }
  step(event, intent, phase = 'scenario') {
    this.native.lastDriver = this;
    const out = this.native.call('step', { ...this.input, state: this.state, event });
    this.state = out.state;
    const trace = phase === 'selection' ? this.selectionTrace : phase === 'hydration' ? this.hydrationTrace : this.trace;
    trace.push({ intent, event, result: out.result, screen: this.state.screen,
      commits: this.state.commits, popup: this.state.popup ?? null });
    return out.result;
  }
  route(target, unavailable = new Set()) {
    const walk = advanced => {
      const queue = [[this.state.screen, [], this.state.history]], visited = new Set();
      while (queue.length) {
        const [id, path, history] = queue.shift();
        if (id === target) return path;
        if (visited.has(id)) continue;
        visited.add(id);
        const screen = this.program.screens.find(s => s.id === id);
        for (const c of screen?.components ?? []) {
          if (unavailable.has(c.id)) continue;
          let next = action(c)?.goto?.screen;
          let nextHistory = advanced ? [id, ...history] : history;
          if (advanced && action(c) === 'back' && history.length) {
            next = history[0]; nextHistory = history.slice(1);
          }
          if (advanced && c.kind?.macro) {
            const macro = this.program.macros.find(m => m.id === c.kind.macro.id);
            if (macro?.steps.length && macro.steps.every(s => s.goto)) {
              let from = id;
              nextHistory = history;
              for (const step of macro.steps) { nextHistory = [from, ...nextHistory]; from = step.goto.screen; }
              next = from;
            }
          }
          if (next && !visited.has(next)) queue.push([next, [...path, c], nextHistory]);
        }
      }
      return null;
    };
    // Preserve ordinary paths; also understand navigation macros and actual
    // back history when no ordinary route remains available.
    return walk(false) ?? walk(true);
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
    if (this.program.patientSelection && !this.state.patientContext?.patient)
      throw new Failure(`No patient open: select a patient before finding ${description}`, 'no-patient-open');
    if (this.program.patientSelection && this.state.patientContext?.bound !== this.facts.sourcePatientId)
      throw new Failure(`Patient chart is loading: cannot find ${description}`, 'patient-not-bound');
    const activeBinding = c => !c.kind?.field || c.kind.field.slot === 'current' || c.kind.field.slot.fixed?.n === this.state.currentSlot ? 0 : 1;
    const candidates = this.program.screens.flatMap(s => s.components.filter(predicate).map(c => ({ s, c, route: this.route(s.id) })))
      .filter(x => x.route !== null)
      .sort((a, b) => Number(b.s.workflow === workflow) - Number(a.s.workflow === workflow) || activeBinding(a.c) - activeBinding(b.c) || a.route.length - b.route.length);
    for (const { s, c } of candidates) {
      const unavailable = new Set();
      const bound = this.program.screens.reduce((n, sc) => n + sc.components.length, 1);
      for (let attempt = 0; attempt < bound; attempt++) {
        const path = this.route(s.id, unavailable);
        if (path === null) break;
        let reached = true;
        for (const navigation of path) {
          if (!this.reveal(navigation)) { unavailable.add(navigation.id); reached = false; break; }
          const result = this.step({ click: { comp: navigation.id } }, `navigate toward ${description}`);
          if (result !== 'ok') { unavailable.add(navigation.id); reached = false; break; }
        }
        if (reached) {
          if (this.reveal(c)) return c;
          break;
        }
      }
    }
    if (optional) return null;
    throw new Failure(`Workflow impossible: no reachable shown control for ${description}`, 'missing-control');
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
    d.selectionTrace = structuredClone(this.selectionTrace); d.hydrationTrace = structuredClone(this.hydrationTrace);
    return d;
  }
  assertCaptured(element, value, slot) {
    const captured = this.capture(element, slot);
    assert(captured?.confirmed && same(captured.value, value), `${element} not confirmed with expected value`);
  }
}
