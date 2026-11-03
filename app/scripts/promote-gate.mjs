/* global document, window, getComputedStyle, innerWidth, innerHeight, structuredClone, console */
/** Independent projection for native ordinary board/dated nodes. No clinical writes. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEhrInterp } from "../public/ehr/interp-loader.mjs";
import { readFile } from "node:fs/promises";
import { expectedNodeAria, observedAria } from "../src/ehr/ui/fidelity.ts";
import { startLab, paint, atoms } from "./exotic-gate.mjs";

export const native = (input) =>
  JSON.parse(
    execFileSync("lean/.lake/build/bin/exotic-api", [], {
      input: JSON.stringify(input) + "\n",
      encoding: "utf8",
    }),
  );

/** Expected source list is supplied by Lean, independently from the painter. */
export async function gateOrdinary(page, view) {
  const owner = view.ordinary?.board?.children.find(n => n.patientPane?.modal.length)?.patientPane.patient;
  const expectedPanes = view.panes.map((p) => ({
    interactive: !owner || owner === p.patient,
    patient: p.patient,
    banner: p.screen.banner,
    nodes: atoms(
      p.screen.modal
        ? [p.screen.modal]
        : [...p.screen.workspace, ...p.screen.side],
    ),
  }));
  const contentFailures = await page.evaluate((panes) => {
    const errors = [];
    for (const p of panes) {
      const pane = [...document.querySelectorAll("[data-patient]")].find(
        (el) => el.dataset.patient === p.patient,
      );
      if (!pane) {
        errors.push(`Missing pane ${p.patient}`);
        continue;
      }
      const banner = pane.querySelector('[aria-label="Patient banner"]');
      for (const [, value] of p.banner)
        if (!banner?.textContent.includes(value))
          errors.push(`Wrong banner ${p.patient}`);
      const components = [...pane.querySelectorAll("[data-comp-id]")];
      const infos = [...pane.querySelectorAll("[data-info-id]")];
      const sourceText = (el) =>
        [
          el.textContent,
          ...[el, ...el.querySelectorAll("[aria-label],[title]")]
            .filter((e) => e.getClientRects().length)
            .flatMap((e) => [
              e.getAttribute("aria-label") ?? "",
              e.getAttribute("title") ?? "",
            ]),
        ].join(" ");
      for (const n of p.nodes) {
        const [kind, v] = Object.entries(n)[0];
        if (!["button", "field", "info", "alert"].includes(kind)) continue;
        const candidates =
          kind === "info"
            ? infos.filter((el) => el.dataset.infoId === v.infoId)
            : components.filter((el) => el.dataset.compId === v.comp);
        const el = candidates.find((el) => {
          const r = el.getBoundingClientRect(),
            s = getComputedStyle(el);
          return (
            r.width > 0 &&
            r.height > 0 &&
            s.display !== "none" &&
            s.visibility !== "hidden"
          );
        });
        if (!el) {
          errors.push(
            `Hidden/missing ${p.patient}/${kind}/${v.comp ?? v.infoId}`,
          );
          continue;
        }
        if (parseFloat(getComputedStyle(el).fontSize) < 12)
          errors.push(`Illegible ${v.comp}`);
        if (kind === "button") {
          const button =
            candidates.find((e) => e.matches("button")) ??
            el.querySelector("button");
          if (
            !button ||
            button.disabled === v.enabled ||
            (!v.enabled && !v.blockedReason)
          )
            errors.push(`Dishonest ${v.comp}`);
        }
        if (
          kind === "info" &&
          !candidates.some((e) => {
            const text = sourceText(e);
            return v.rows.every((row) =>
              row.every(([, value]) => !value || text.includes(value)),
            );
          })
        )
          errors.push(`Incomplete source ${p.patient}/${v.infoId}`);
      }
      if (p.interactive) {
        const active = pane.querySelector(".board-modal") ?? pane;
        const controls = [...active.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)")]
          .filter(e => e.getClientRects().length && e.type !== "hidden" && !e.closest("[inert],[hidden],[aria-hidden='true']"));
        for (const control of controls) {
          control.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});
          const r = control.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
          if (r.left<0 || r.top<0 || r.right>innerWidth || r.bottom>innerHeight || (hit!==control && !control.contains(hit)))
            errors.push(`Unreachable/occluded control ${p.patient}/${control.closest("[data-comp-id]")?.getAttribute("data-comp-id")}`);
          if (p.banner.length) {
            const identity = active.querySelector(".board-identity");
            const b = identity?.getBoundingClientRect();
            const over = b && document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
            if (!b || b.width<=0 || b.height<=0 || b.top<0 || b.bottom>innerHeight || (over!==identity && !identity.contains(over)))
              errors.push(`Patient identity not perceived with control ${p.patient}`);
            for(const [key,value]of p.banner.filter(([key])=>key==="Patient"||key==="MRN"))
              if(!identity?.textContent.includes(value))errors.push(`Wrong compact ${key} ${p.patient}`);
          }
        }
      }
    }
    return errors;
  }, expectedPanes);
  assert.deepEqual(contentFailures, []);
  if (view.ordinary && "board" in view.ordinary) {
    const aria = observedAria(
      await page.locator(".clinical-board").ariaSnapshot(),
    );
    assert.deepEqual(
      aria,
      expectedNodeAria(view.ordinary),
      "Independent board accessibility projection",
    );
    const expected = view.ordinary.board.urgent;
    const findings = await page.evaluate((expected) => {
      const errors = [];
      const nodes = [...document.querySelectorAll("[data-urgent-patient]")];
      if (nodes.length !== expected.length)
        errors.push("Urgent rail multiplicity");
      for (const [i, d] of expected.entries()) {
        const el = nodes[i],
          r = el?.getBoundingClientRect(),
          style = el ? getComputedStyle(el) : null;
        if (
          !el ||
          el.dataset.urgentPatient !== d.patient ||
          el.dataset.alertId !== d.alertId ||
          !el.textContent.includes(d.label)
        )
          errors.push("Urgent rail identity");
        if (
          !r ||
          r.width <= 0 ||
          r.height <= 0 ||
          r.left < 0 ||
          r.top < 0 ||
          r.right > innerWidth ||
          r.bottom > innerHeight ||
          Number.parseFloat(style.fontSize) < 12
        )
          errors.push("Urgent exposure");
        if (r) {
          const top = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          if (top !== el && !el.contains(top)) errors.push("Urgent occlusion");
        }
      }
      const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
      if (new Set(ids).size !== ids.length)
        errors.push("Duplicate DOM identity");
      for (const el of document.querySelectorAll("[aria-describedby]"))
        for (const id of el.getAttribute("aria-describedby").split(/\s+/)) {
          const target = document.getElementById(id);
          if (
            !target ||
            target.closest("[data-patient]") !== el.closest("[data-patient]")
          )
            errors.push("Cross-pane ARIA reference");
        }
      return errors;
    }, expected);
    assert.deepEqual(findings, []);
  }
  // Native full observer retains source bytes and patient namespaces. Require it
  // for the promotion corpus, independently of the clinical atom projection.
  assert.ok(Array.isArray(view.indexObservation), "Native full index observation required");
  assert.deepEqual(native({op:"observe-index",node:view.ordinary}), view.indexObservation);
  const expectedDates = [];
  const walk = (nodes,patient=null) => {
    for (const n of nodes) {
      if (n.datedTimeline) expectedDates.push({...n.datedTimeline,patient});
      const v = Object.values(n)[0];
      if (n.patientPane) {
        walk(v.children,v.patient);
        if (!owner || owner===v.patient) walk(v.modal,v.patient);
      } else if (v.children) walk(v.children,patient);
    }
  };
  walk(view.indexObservation);
  const observed = await page.locator(".clinical-dated").evaluateAll((es) =>
    es.map((el) => ({
      patient: el.closest("[data-patient]")?.getAttribute("data-patient")??null,
      dated: [
        ...el.querySelectorAll('ol[aria-label="Dated source events"] > li'),
      ].map((row) => ({
        second: Number(row.dataset.second),
        nano: Number(row.dataset.nanosecond),
        text: row.textContent,
      })),
      undated: [
        ...el.querySelectorAll('[aria-label="Unpositioned source events"] li'),
      ].map((row) => row.textContent),
    })),
  );
  assert.equal(observed.length, expectedDates.length, "Dated container count");
  for (const [i, d] of expectedDates.entries()) {
    assert.equal(observed[i].patient,d.patient,"Index patient namespace");
    assert.equal(
      observed[i].dated.length,
      d.dated.length,
      "No dated item dropped",
    );
    assert.equal(
      observed[i].undated.length,
      d.undated.length,
      "No undated item dropped",
    );
    for (const [j, item] of d.dated.entries()) {
      const row = observed[i].dated[j];
      assert.equal(row.second, item.utcSecond);
      assert.equal(row.nano, item.nanosecond);
      for (const value of Object.values(item.source))
        assert.ok(row.text.includes(value), "Complete source provenance");
      if (j) {
        const prev = d.dated[j - 1];
        assert.ok(
          prev.utcSecond < item.utcSecond ||
            (prev.utcSecond === item.utcSecond &&
              prev.nanosecond <= item.nanosecond),
          "Chronology",
        );
      }
    }
    for (const [j, item] of d.undated.entries())
      for (const value of Object.values(item))
        assert.ok(observed[i].undated[j].includes(value));
  }
  return {
    panes: view.panes.length,
    dated: expectedDates.reduce((n, d) => n + d.dated.length, 0),
    scope:
      "Supplied state, complete child/source projection; sampled rail exposure",
  };
}

async function main() {
  const out = process.argv[2] ?? "runs/promote";
  if (!path.resolve(out).startsWith(path.resolve("runs") + path.sep))
    throw Error("Use ignored runs/");
  await mkdir(`${out}/screenshots`, { recursive: true });
  const wasm = await loadEhrInterp({
    wasmBinary: await readFile("app/public/ehr/ehr-interp.wasm"),
  });
  let agreementCases = 0;
  const check = (input) => {
    const result = native(input);
    assert.deepEqual(
      JSON.parse(wasm.call("ehr_exotic", JSON.stringify(input))),
      result,
      "Native/WASM agreement",
    );
    agreementCases++;
    return result;
  };
  const canonical = check({ op: "canonical" });
  for (const timestamp of [
    "2026-11-02T01:30:00-07:00",
    "2026-11-02T08:30:00Z",
    "2026-11-02T01:30:00+00:00",
    "2026-11-02T01:30:00+13:45",
    "1969-12-31T23:59:59Z",
    "2026-11-02T08:30:00.123456789Z",
    "2026-11-02T08:30:00-00:00",
    "2026-02-30T08:30:00Z",
    "2026-11-02T08:30:00",
    "2026-11-02",
  ])
    check({ op: "timestamp", timestamp });

  const sessions = ["patient-a", "patient-b"].map((patient, index) => {
    const input = structuredClone(canonical.input);
    input.facts.sourcePatientId = patient;
    input.facts.patientId = patient;
    input.display.sourcePatientId = patient;
    input.display.banner.name = `Example ${index + 1}`;
    input.display.banner.mrn = patient;
    input.display.timelineSources = [
      {
        resource: "Observation/later",
        field: "effectiveDateTime",
        timestamp: "2026-11-02T01:30:00-08:00",
      },
      {
        resource: "Observation/earlier",
        field: "issued",
        timestamp: "2026-11-02T01:30:00-07:00",
      },
      {
        resource: "Observation/duplicate",
        field: "issued",
        timestamp: "2026-11-02T01:30:00-07:00",
      },
      {
        resource: "Observation/local",
        field: "effectiveDateTime",
        timestamp: "2026-11-02T01:30:00",
      },
      {
        resource: "Observation/old",
        field: "issued",
        timestamp: "1969-12-31T23:59:59Z",
      },
    ];
    input.facts.infoPayloads=[];
    const info=atoms(check({op:"render",render:input}).screen.workspace).find(n=>n.info?.rows.length)?.info;
    assert.ok(info?.rows.length,"Shown full-row source witness");
    input.display.timelineBackings=input.display.timelineSources.map((source,occurrence)=>({source,occurrence,info:info.infoId,row:info.rows[0]}));
    return { patient, input, receipts: [] };
  });
  assert.ok(check({ op: "board", sessions: [sessions[0], sessions[0]] }).error);
  const wrong = structuredClone(sessions);
  wrong[0].input.display.sourcePatientId = "patient-b";
  assert.ok(check({ op: "board", sessions: wrong }).error);
  const receipt = {
    info: "allergyList",
    dataVersion: 3,
    time: 600,
    role: "physician",
    user: "physician",
  };
  const foreign = structuredClone(sessions);
  foreign[1].receipts = [{ patient: "patient-a", episode: null, receipt }];
  assert.deepEqual(
    check({ op: "board", sessions: foreign }).node,
    check({ op: "board", sessions }).node,
  );
  const urgent = structuredClone(sessions);
  urgent[0].input.spec.alerts.push({
    id: "drugAllergyOrder",
    label: "Active urgent condition in patient A",
    commit: "signOrders",
    cond: "careGap",
    tier: "passive",
    screens: [],
  });
  // B's unrelated modal must not suppress A's clinically active demand.
  urgent[1].input.state.popup = ["drugAllergy", "unrelated"];
  const before = check({ op: "board", sessions: urgent });
  assert.equal(before.node.board.urgent.length, 1);
  const blocked = check({
    op: "board",
    sessions: urgent,
    patient: "patient-a",
    event: { confirm: { comp: "weightAtSign" } },
  });
  assert.deepEqual(blocked.sessions, urgent);
  assert.ok(blocked.result.blocked);
  const dated = check({ op: "dated", render: sessions[0].input });
  assert.deepEqual(
    dated.dated.map((d) => d.source.resource),
    [
      "Observation/old",
      "Observation/earlier",
      "Observation/duplicate",
      "Observation/later",
    ],
  );
  assert.equal(dated.undated.length, 1);
  // Hidden rows and payload overrides cannot authorize an index. Equal DTOs
  // at different source positions retain distinct permission.
  const hidden=structuredClone(sessions[0].input);
  const baseline=check({op:"render",render:hidden}).screen;
  const empty=check({op:"date-index",render:hidden,screen:{...baseline,workspace:[],side:[]}});
  assert.deepEqual(empty.dated,[]);assert.deepEqual(empty.undated,[]);
  hidden.display.timelineSources.push(hidden.display.timelineSources[0]);
  const withDuplicate=check({op:"dated",render:hidden});
  assert.equal(withDuplicate.dated.length,dated.dated.length,"Unbacked identical occurrence withheld");
  const overridden=structuredClone(sessions[0].input);
  overridden.facts.infoPayloads=[{info:overridden.display.timelineBackings[0].info,
    patient:overridden.facts.patientId,artifactKey:"override",artifact:"override-doc",version:1,
    fields:[],identifiers:[],availability:[],rows:[]}];
  overridden.facts.artifactBindings=[{key:"override",artifact:"override-doc",version:1}];
  const overrideIndex=check({op:"date-index",render:overridden,screen:baseline});
  assert.deepEqual(overrideIndex.dated,[]);assert.deepEqual(overrideIndex.undated,[]);
  const badNano=structuredClone(dated.node);
  const dateNode=badNano.board.children[0].patientPane.children.find(n=>n.datedTimeline);
  dateNode.datedTimeline.dated[0].nanosecond=1e9;
  assert.ok(check({op:"observe-index",node:badNano}).error,"Fin nanosecond decode bound");
  const mismatch=structuredClone(sessions[0].input);mismatch.display.sourcePatientId="another-patient";
  const noBinding=check({op:"dated",render:mismatch});
  assert.deepEqual(noBinding.dated,[]);assert.deepEqual(noBinding.undated,[]);
  const lab = await startLab(),
    checks = [];
  try {
    for (const width of [1440, 390]) {
      const page = await lab.browser.newPage({
        viewport: { width, height: 900 },
      });
      await page.goto(lab.url);
      for (const modal of [false, true]) {
        const ss = modal ? urgent : sessions,
          board = check({ op: "board", sessions: ss });
        const panes = ss.map((s) => ({
          patient: s.patient,
          screen: check({ op: "render", render: s.input }).screen,
        }));
        const view = { mode: "board", panes, ordinary: board.node, indexObservation: board.indexObservation };
        await paint(page, view);
        checks.push({ width, modal, ...(await gateOrdinary(page, view)) });
        for (const patient of ss.map((s) => s.patient)) {
          await page.locator(`[data-patient="${patient}"]`).evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          await gateOrdinary(page, view);
        }
        await page.screenshot({
          path: `${out}/screenshots/board-${modal ? "modal-" : ""}${width}.png`,
          fullPage: true,
        });
        if (modal) {
          await page.locator("[data-urgent-patient]").evaluate((el) => {
            el.style.display = "none";
          });
          await assert.rejects(() => gateOrdinary(page, view));
          checks.push({ width, hiddenUrgent: "rejected" });
        } else {
          const button = canonical.commands.find((c) => c.enabled);
          await page
            .locator(`[data-patient="patient-b"] [data-comp-id="${button.id}"]`)
            .first()
            .click();
          assert.equal(
            (await page.evaluate(() => window.researchEvents.at(-1))).patient,
            "patient-b",
          );
          await page.evaluate(() => {
            const cover=document.createElement("div");
            cover.id="control-occlusion-adversary";
            const board=document.querySelector(".clinical-board");
            const rail=board.querySelector(".board-urgency");
            const top=Math.max(board.getBoundingClientRect().top,rail.getBoundingClientRect().bottom)+2;
            Object.assign(cover.style,{position:"fixed",top:`${top}px`,bottom:"0",left:"0",right:"0",zIndex:"5000"});
            document.body.append(cover);
          });
          await assert.rejects(() => gateOrdinary(page,view));
          await page.locator("#control-occlusion-adversary").evaluate(el=>el.remove());
          checks.push({width,coveredControls:"rejected"});
        }
      }
      const view = {
        mode: "dated",
        panes: [{ patient: "patient-a", screen: dated.screen }],
        ordinary: dated.node,
        indexObservation: dated.indexObservation,
      };
      await paint(page, view);
      checks.push({ width, ...(await gateOrdinary(page, view)) });
      await page.locator('[data-patient]').evaluateAll(es=>es.forEach(el=>{el.scrollTop=0;}));
      await page.screenshot({
        path: `${out}/screenshots/dated-${width}.png`,
        fullPage: true,
      });
      const list = page.locator('ol[aria-label="Dated source events"]');
      await list.evaluate((el) => el.prepend(el.lastElementChild));
      await assert.rejects(() => gateOrdinary(page, view));
      await paint(page, view);
      await list.evaluate((el) => el.firstElementChild.remove());
      await assert.rejects(() => gateOrdinary(page, view));
      checks.push({ width, reordered: "rejected", dropped: "rejected" });
      await page.close();
    }
  } finally {
    await lab.close();
  }
  await writeFile(
    `${out}/promotion-gate.json`,
    JSON.stringify(
      {
        checks,
        agreementCases,
        bindings: "Native ordinary constructors; no persistence",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      checks: checks.length,
      nativeRejections: 4,
      agreementCases,
    }),
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
