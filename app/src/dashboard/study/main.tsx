import "@mantine/core/styles.css";
import "./study.css";
import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { MantineProvider } from "@mantine/core";
import type { Event } from "../../../../lean/generated/ehr-types";
import { loadEhrInterp } from "../../../public/ehr/interp-loader.mjs";
import type { EhrInterp } from "../../../public/ehr/interp-loader.mjs";
import { UiScreenView } from "../../ehr/ui/Screen";
import { ResearchWorkspace, activeButtons, commandEvent } from "../../ehr/ui/Exotic";
import { clinicalTheme } from "../../ehr/ui/theme";
import { studyRequest } from "../data";
import { StudyEngine } from "./engine";
import { sequence, sessionSchema, travel, tlxItems, susItems, type StudyConfig, type StudySession, type Trial, type ChoiceContext } from "./model";

declare global { interface Window { studyHarness?: { input: () => unknown; step: (event: Event) => void; completed: () => boolean } } }
function App({ config, wasm }: { config: StudyConfig; wasm: EhrInterp }) {
  const [participant, setParticipant] = useState("P001"), [slot, setSlot] = useState(0);
  const [agreed, setAgreed] = useState(false), [session, setSession] = useState<StudySession | null>(null);
  const [engine, setEngine] = useState<StudyEngine | null>(null), [, redraw] = useState(0);
  const [phase, setPhase] = useState<"consent" | "ready" | "task" | "survey" | "done">("consent");
  const [position, setPosition] = useState(-4), [pending, setPending] = useState<Trial | null>(null);
  const [tlx, setTlx] = useState<string[]>([]), [sus, setSus] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const writeQueue = useRef(Promise.resolve());
  function save(value: StudySession) {
    const copy = structuredClone(value);
    setMessage("Saving locally…");
    writeQueue.current = writeQueue.current.catch(() => {}).then(async () => {
      const response = await studyRequest("session", copy);
      setMessage(`Saved locally: ${JSON.stringify(response)}`);
    }).catch(error => { setMessage(`SAVE FAILED. Keep this page open and retry Export: ${String(error)}`); });
  }
  function currentSession(status: StudySession["status"] = "in-progress") {
    if (!session) throw Error("Consent required");
    const current = phase === "task" && engine ? engine.snapshot(position, position < 0, "give-up") : pending;
    return { ...session, status, trials: [...session.trials, ...(current ? [current] : [])] };
  }
  async function begin() {
    if (!/^P\d{3}$/.test(participant) || !Number.isInteger(slot) || slot < 0 || !agreed) return;
    const stamp = new Date().toISOString();
    const value: StudySession = { schemaVersion: 1, studyId: config.id, manifestHash: config.manifestHash,
      sessionId: crypto.randomUUID(), participant, slot, provenance: config.dryRun ? "simulated-dry-run" : "human",
      consentVersion: config.consent, consentAt: stamp, startedAt: stamp, status: "in-progress",
      viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio }, trials: [] };
    try {
      setMessage("Saving consent locally…");
      const receipt = await studyRequest("session", value);
      setSession(value); setMessage(`Saved locally: ${JSON.stringify(receipt)}`); setPhase("ready");
    } catch (error) { setMessage(`Consent was not saved: ${String(error)}. Check the participant ID with the facilitator.`); }
  }
  function startTask() {
    const assignment = position < 0 ? sequence(slot)[position + 4] : sequence(slot)[position];
    if (!assignment) return;
    const scenario = position < 0 ? config.practice : config.cases[assignment.caseIndex];
    if (!scenario) throw Error("Missing counterbalanced case");
    setEngine(new StudyEngine(wasm, scenario, assignment.design)); setPhase("task");
  }
  function choices(): ChoiceContext {
    if (!engine) return { state: {}, options: [] };
    // Actual exposed, enabled buttons only; never append the human's chosen action.
    const exposed = (comp: string) => [...(stage.current?.querySelectorAll<HTMLElement>("[data-comp-id], [data-command]") ?? [])].some(el => {
      if (el.dataset.compId !== comp && el.dataset.command !== comp) return false;
      const r = el.getBoundingClientRect(), clip = stage.current?.getBoundingClientRect();
      if (!clip || el.closest("[inert]") || getComputedStyle(el).visibility === "hidden") return false;
      const left = Math.max(0, r.left, clip.left), right = Math.min(innerWidth, r.right, clip.right);
      const top = Math.max(0, r.top, clip.top), bottom = Math.min(innerHeight, r.bottom, clip.bottom);
      if (right <= left || bottom <= top) return false;
      const target = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
      return Boolean(target && (target === el || el.contains(target)));
    });
    const unique = new Map(activeButtons(engine.screen).filter(b => b.enabled && exposed(b.comp)).map(b => {
      const event = commandEvent(b.comp, b.role);
      return [JSON.stringify(event), { id: JSON.stringify(event), label: b.label, event }];
    }));
    return { state: { screen: engine.screen.title, slot: engine.input.state.currentSlot, mode: engine.design, episode: engine.episode, exposure: "viewport-intersecting enabled buttons; entries and offscreen actions excluded" }, options: [...unique.values()] };
  }
  function emit(event: Event, patient = engine?.scenario.patient) {
    if (!engine) return;
    if (patient !== engine.scenario.patient) { engine.effort.wrongPatient++; redraw(n => n + 1); return; }
    try { engine.step(event, choices()); redraw(n => n + 1); }
    catch (error) { setMessage(`Task stopped: ${String(error)}. Export and contact the facilitator.`); }
  }
  useEffect(() => {
    if (!config.dryRun || !engine || phase !== "task") { delete window.studyHarness; return; }
    window.studyHarness = { input: () => engine.input, step: event => emit(event), completed: () => engine.completed };
    return () => { delete window.studyHarness; };
  });
  useEffect(() => {
    if (!engine || phase !== "task") return;
    let pointer: { x: number; y: number } | null = null;
    const offsets = new Map<EventTarget, { x: number; y: number }>();
    const inside = (event: globalThis.Event) => event.target instanceof Node && Boolean(stage.current?.contains(event.target));
    const click = (e: MouseEvent) => { if (inside(e) && e.detail > 0) engine.effort.clicks++; };
    const key = (e: KeyboardEvent) => { if (inside(e)) engine.effort.keys++; };
    const move = (e: PointerEvent) => {
      if (!inside(e) || e.pointerType !== "mouse") { pointer = null; return; }
      const next = { x: e.clientX, y: e.clientY }; engine.effort.mouseTravelPx += travel(pointer, next); pointer = next;
    };
    const scroll = (e: globalThis.Event) => {
      if (!(e.target instanceof HTMLElement) || !inside(e)) return;
      const old = offsets.get(e.target) ?? { x: 0, y: 0 }, next = { x: e.target.scrollLeft, y: e.target.scrollTop };
      const delta = travel(old, next);
      if (delta) { engine.effort.scrolls++; engine.effort.scrollPx += delta; }
      offsets.set(e.target, next);
    };
    const visibility = () => { engine.hidden(document.hidden); pointer = null; };
    document.addEventListener("click", click, true); document.addEventListener("keydown", key, true);
    document.addEventListener("pointermove", move, true); document.addEventListener("scroll", scroll, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("click", click, true); document.removeEventListener("keydown", key, true);
      document.removeEventListener("pointermove", move, true); document.removeEventListener("scroll", scroll, true);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [engine, phase]);
  useEffect(() => {
    if (phase !== "task") return;
    const timer = setInterval(() => save(currentSession()), 15000);
    return () => clearInterval(timer);
  }, [phase, engine, session, position, pending]);
  function finishTask(reason: "complete" | "give-up") {
    if (!engine || !session) return;
    const trial = engine.snapshot(position, position < 0, reason);
    if (position < 0) {
      const value = { ...session, trials: [...session.trials, trial] };
      setSession(value); save(value); setPosition(position + 1); setPhase("ready");
    } else {
      setPending(trial); setTlx([]); setSus([]); setPhase("survey");
      save({ ...session, trials: [...session.trials, trial] });
    }
    setEngine(null);
  }
  function finishSurvey() {
    if (!pending || !session) return;
    const last = position === 3;
    const value = sessionSchema.parse({ ...session, status: last ? "complete" : "in-progress",
      trials: [...session.trials, { ...pending, tlx: tlx.map(Number), sus: sus.map(Number) }] });
    setSession(value); setPending(null); save(value); setPosition(position + 1); setPhase(last ? "done" : "ready");
  }
  const ready = position < 0 ? sequence(slot)[position + 4] : sequence(slot)[position];
  return <MantineProvider theme={{ ...clinicalTheme, components: { ...clinicalTheme.components,
    ModalRoot: { defaultProps: { withinPortal: false, trapFocus: false } },
  } }}><div className="study-shell">
    <header className="study-header"><strong>VGI · Synthetic patient pilot {config.dryRun && "· SIMULATED DRY RUN"}</strong>
      {session && <><button onClick={() => save(currentSession(phase === "done" ? session.status : "in-progress"))}>Export checkpoint</button>
        {phase !== "done" && <button onClick={() => { const value = currentSession("withdrawn"); setSession(value); save(value); setEngine(null); setPending(null); setPhase("done"); }}>Withdraw and stop</button>}</>}
      <output role="status">{message}</output></header>
    {phase === "consent" && <section className="study-card"><h1>Participant information and consent</h1><pre>{config.consent}</pre>
      <label>Participant ID (assigned by facilitator)<input value={participant} onChange={e => setParticipant(e.target.value)} pattern="P[0-9]{3}" /></label>
      <label>Allocation slot (assigned before arrival)<input type="number" min="0" value={slot} onChange={e => setSlot(Number(e.target.value))} /></label>
      <label><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />I have read this information and voluntarily agree to participate.</label>
      <button disabled={!agreed || !/^P\d{3}$/.test(participant) || !Number.isInteger(slot) || slot < 0} onClick={begin}>Consent and continue</button>
      <button onClick={() => { setPhase("done"); setMessage("No consent given; no participant record saved."); }}>Decline</button></section>}
    {phase === "ready" && <section className="study-card"><h1>{position < 0 ? `Practice ${position + 5}/4` : `Measured block ${position + 1}/4`} · {ready?.design}</h1>
      <p>Work at your usual pace. Use only the supplied synthetic case. Do not enter real names, identifiers, patient details, or passwords.</p>
      <p>Review and confirm using the displayed controls. Command palette: Ctrl/Cmd+K, type, arrows, Enter. Dated view adds the 12 most recent source-dated history items. Breaks belong between blocks; a block can be stopped at any time.</p>
      <button onClick={startTask}>Start task</button></section>}
    {phase === "task" && engine && <><section className="study-instruction"><p>{engine.scenario.instruction}</p><strong>Episode {engine.episode + 1}/{engine.scenario.episodes.length}</strong>
      <button disabled={!engine.completed} onClick={() => finishTask("complete")}>Finish completed task</button><button onClick={() => finishTask("give-up")}>Stop task / unable to finish</button></section>
      <div className="study-stage" ref={stage} tabIndex={-1}>
        {engine.design === "stack" || !engine.screen.banner.length ? <UiScreenView screen={engine.screen} onEvent={event => emit(event)} /> :
          <ResearchWorkspace value={{ mode: engine.design, panes: [{ patient: engine.scenario.patient, screen: engine.screen }], ...(engine.design === "dated" ? { axis: engine.scenario.axis } : {}) }} onEvent={({ patient, event }) => emit(event, patient)} />}
      </div></>}
    {phase === "survey" && <section className="study-card"><h1>Ratings for {pending?.design}</h1>
      <h2>Short NASA-TLX (unweighted raw ratings)</h2><p>0 = low/successful; 100 = high/unsuccessful. No pairwise weighting.</p>
      {tlxItems.map((item, i) => <label key={item}>{item}<input aria-label={item} type="number" min="0" max="100" step="1" required value={tlx[i] ?? ""} onChange={e => setTlx(a => Array.from({ length: 6 }, (_, n) => n === i ? e.target.value : a[n] ?? ""))} /></label>)}
      <h2>System Usability Scale</h2><p>For this design: 1 = strongly disagree; 5 = strongly agree.</p>
      {susItems.map((item, i) => <label key={item}>{i + 1}. {item}<select aria-label={`SUS ${i + 1}`} value={sus[i] ?? ""} onChange={e => setSus(a => Array.from({ length: 10 }, (_, n) => n === i ? e.target.value : a[n] ?? ""))}><option value="">Choose</option>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>)}
      <button disabled={tlx.length !== 6 || tlx.some(x => x === "" || !Number.isInteger(Number(x)) || Number(x) < 0 || Number(x) > 100) || sus.length !== 10 || sus.some(x => !x)} onClick={finishSurvey}>Save ratings and continue</button></section>}
    {phase === "done" && <section className="study-card"><h1>Session ended</h1><p>{session?.status === "withdrawn" ? "Participation stopped. Ask the facilitator to delete your local record if you want it removed." : "Thank you. The facilitator can verify the local export above."}</p></section>}
  </div></MantineProvider>;
}
const element = document.getElementById("root");
if (!element) throw Error("Missing study root");
const config = await studyRequest<StudyConfig>("config");
const wasm = await loadEhrInterp({ locateFile: filename => `/ehr/${filename}` });
createRoot(element).render(<App config={config} wasm={wasm} />);
