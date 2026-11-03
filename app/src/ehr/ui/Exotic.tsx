import { useEffect, useRef, useState } from "react";
import { BoardEvents } from "./Board";
import { z } from "zod";
import type { Event } from "../../../../lean/generated/ehr-types";
import { UiChildren } from "./nodes";
import {
  uiNodeSchema,
  uiScreenSchema,
  type UiNode,
  type UiScreen,
} from "./types";
import { SourceLabelsContext, EntryHintsContext } from "./SourceLabels";
import { FieldSourceContext } from "./clinical-metadata";
import { FieldChoicesContext } from "./FieldChoices";
import "./exotic.css";

export const researchSchema = z
  .strictObject({
    ordinary: uiNodeSchema.optional(),
    mode: z.enum(["command", "spatial", "board", "dated"]),
    panes: z
      .array(
        z.strictObject({ patient: z.string().min(1), screen: uiScreenSchema }),
      )
      .min(1),
    axis: z
      .strictObject({
        dated: z.array(
          z.strictObject({
            minute: z.number().int().nonnegative(),
            node: uiNodeSchema,
          }),
        ),
        undated: z.array(uiNodeSchema),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode !== "board" && v.panes.length !== 1)
      ctx.addIssue({
        code: "custom",
        message: "Multiple sessions require board mode",
      });
    if (
      new Set(v.panes.map((p) => p.patient)).size !== v.panes.length ||
      (v.panes.some((p) => !p.screen.banner.length) && !v.ordinary)
    )
      ctx.addIssue({
        code: "custom",
        message: "Unique patient bindings and nonempty banners required",
      });
    if (
      v.axis?.dated.some(
        (e, i, a) => i > 0 && e.minute < (a[i - 1]?.minute ?? 0),
      )
    )
      ctx.addIssue({ code: "custom", message: "Chronology rejected" });
  });
export type ResearchView = z.infer<typeof researchSchema>;
export type ScopedEvent = { patient: string; event: Event };

/** Independent from clinical state: only full UiNodes and their existing events. */
export function activeButtons(
  s: UiScreen,
): Extract<UiNode, { button: unknown }>["button"][] {
  const walk = (n: UiNode): ReturnType<typeof activeButtons> => {
    if ("button" in n) return [n.button];
    if ("section" in n) return n.section.children.flatMap(walk);
    if ("datedTimeline" in n) return n.datedTimeline.children.flatMap(walk);
    if ("board" in n) return n.board.children.flatMap(walk);
    if ("patientPane" in n)
      return (
        n.patientPane.modal.length
          ? n.patientPane.modal
          : n.patientPane.children
      ).flatMap(walk);
    if ("timeline" in n) return n.timeline.children.flatMap(walk);
    if ("columns" in n) return n.columns.children.flatMap(walk);
    if ("tabs" in n) return n.tabs.body.flatMap(walk);
    if ("presentation" in n) return n.presentation.children.flatMap(walk);
    if ("valueSet" in n) return n.valueSet.children.flatMap(walk);
    if ("chartReferences" in n) return n.chartReferences.children.flatMap(walk);
    if ("rowAction" in n) return n.rowAction.children.flatMap(walk);
    return [];
  };
  return s.modal
    ? walk(s.modal)
    : [...s.workspace, ...s.side].flatMap(walk).concat(
        s.nav.flatMap(([, pairs]) =>
          pairs.map(([comp, label]) => ({
            comp,
            label,
            role: "navigation",
            enabled: true,
            blockedReason: null,
            hotkey: null,
          })),
        ),
      );
}
/** Same event mapping as the ordinary button painter. Never turn a confirmation
or acknowledgment into a generic click. The prototype's role refinement is tested. */
export function commandEvent(comp: string, role: string): Event {
  if (role === "ack") return { ack: { alert: comp } };
  if (role === "confirm") return { confirm: { comp } };
  return { click: { comp } };
}

function Palette({
  screen,
  emit,
}: {
  screen: UiScreen;
  emit: (e: Event) => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const commands = activeButtons(screen)
    .filter((c) =>
      `${c.label} ${c.comp}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.comp.toLowerCase() === query.toLowerCase()) -
        Number(a.comp.toLowerCase() === query.toLowerCase()),
    );
  const execute = (i: number) => {
    const c = commands[i];
    if (c?.enabled) emit(commandEvent(c.comp, c.role));
  };
  return (
    <section aria-label="Command palette" className="command-palette">
      <label>
        Commands · Ctrl+K
        <input
          ref={input}
          aria-label="Type a command"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, commands.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              execute(index);
            }
          }}
        />
      </label>
      <ul aria-label="Matching commands">
        {commands.map((c, i) => (
          <li key={`${c.comp}-${i}`} data-selected={i === index}>
            <button
              data-command={c.comp}
              aria-disabled={!c.enabled}
              disabled={!c.enabled}
              onClick={() => execute(i)}
            >
              {c.label}
            </button>
            {!c.enabled && (
              <span role="note">
                {c.blockedReason || "Missing disabled reason — gate failure"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
export { sourceAxis } from "./exotic-axis";
function TimeAxis({ axis }: { axis: NonNullable<ResearchView["axis"]> }) {
  const first = axis.dated[0]?.minute ?? 0;
  const span = Math.max(1, (axis.dated.at(-1)?.minute ?? first) - first);
  return (
    <section aria-label="Dated time axis (UTC)">
      <h2>Clinical history · UTC</h2>
      <svg
        role="img"
        aria-label="Proportional UTC time axis"
        viewBox="0 0 1000 100"
        className="time-axis"
      >
        <line x1="30" y1="35" x2="970" y2="35" stroke="currentColor" />
        {axis.dated.map((e, i) => (
          <g
            key={i}
            data-minute={e.minute}
            transform={`translate(${30 + ((e.minute - first) / span) * 940},35)`}
          >
            <title>{new Date(e.minute * 60000).toISOString()}</title>
            <circle r="7" fill="currentColor" />
            {(i === 0 || i === axis.dated.length - 1) && (
              <text
                aria-hidden="true"
                y={i % 2 ? 50 : -16}
                textAnchor={
                  i === 0
                    ? "start"
                    : i === axis.dated.length - 1
                      ? "end"
                      : "middle"
                }
              >
                {new Date(e.minute * 60000).toISOString().slice(0, 16)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <p>
        Source-date index; complete clinical controls and records follow below.
      </p>
      <ol>
        {axis.dated.map((e, i) => (
          <li key={i} data-minute={e.minute}>
            <time dateTime={new Date(e.minute * 60000).toISOString()}>
              {new Date(e.minute * 60000).toISOString()}
            </time>
            <UiChildren nodes={[e.node]} onEvent={() => {}} />
          </li>
        ))}
      </ol>
      {axis.undated.length > 0 && (
        <p>
          {axis.undated.length} undated items remain in the complete workspace
          below.
        </p>
      )}
    </section>
  );
}
/** All handlers close over a patient binding; there is no ambient selected patient. */
export function ResearchWorkspace({
  value,
  onEvent,
}: {
  value: ResearchView;
  onEvent: (e: ScopedEvent) => void;
}) {
  const view = researchSchema.parse(value);
  const firstPatient = view.panes[0]?.patient;
  if (!firstPatient) throw new Error("Missing patient pane");
  if (view.ordinary)
    return (
      <BoardEvents.Provider value={onEvent}>
        <main className="research">
          <div className="research-label">
            {view.mode === "dated"
              ? "VGI · Ordinary dated timeline · Research · No clinical writes"
              : "VGI · Ordinary patient board · Research · No clinical writes"}
          </div>
          <UiChildren
            nodes={[view.ordinary]}
            onEvent={(event) => onEvent({ patient: firstPatient, event })}
          />
        </main>
      </BoardEvents.Provider>
    );
  const modalOwner = view.panes.find((p) => p.screen.modal !== null)?.patient;
  return (
    <main className={`research research-${view.mode}`}>
      <div className="research-label">
        {view.mode === "dated" &&
        view.panes.some((p) =>
          p.screen.workspace.some((n) => "datedTimeline" in n),
        )
          ? "VGI · Ordinary dated timeline · Research · No clinical writes"
          : "VGI · Exploration laboratory · Sandbox · No clinical writes"}
      </div>
      <div className="research-panes">
        {view.panes.map(({ patient, screen }) => {
          const emit = (event: Event) => {
            if (!modalOwner || modalOwner === patient)
              onEvent({ patient, event });
          };
          const draw = (nodes: UiNode[]) => (
            <UiChildren nodes={nodes} onEvent={emit} />
          );
          return (
            <article
              key={patient}
              data-patient={patient}
              aria-label={`Patient ${patient}`}
              ref={(el) => {
                if (el)
                  el.inert = Boolean(modalOwner && modalOwner !== patient);
              }}
            >
              <header className="research-banner" aria-label="Patient banner">
                {screen.banner.map(([k, v]) => (
                  <span key={k}>
                    <small>{k}</small>
                    <strong>{v}</strong>
                  </span>
                ))}
              </header>
              <FieldSourceContext.Provider
                value={new Map(screen.fieldSources ?? [])}
              >
                <SourceLabelsContext.Provider value={screen.sourceLabels ?? []}>
                  <EntryHintsContext.Provider value={screen.entryHints ?? []}>
                    <FieldChoicesContext.Provider
                      value={screen.fieldChoices ?? []}
                    >
                      <div
                        ref={(el) => {
                          if (el) el.inert = Boolean(screen.modal);
                        }}
                      >
                        <h1>{screen.title}</h1>
                        {view.mode === "command" && !screen.modal && (
                          <Palette screen={screen} emit={emit} />
                        )}
                        {view.mode === "dated" && view.axis && (
                          <TimeAxis axis={view.axis} />
                        )}
                        <nav aria-label="Patient navigation">
                          {screen.nav.flatMap(([, pairs]) =>
                            pairs.map(([id, label]) => (
                              <button
                                key={id}
                                data-comp-id={id}
                                onClick={() => emit({ click: { comp: id } })}
                              >
                                {label}
                              </button>
                            )),
                          )}
                        </nav>
                        <div className="research-zones">
                          <section aria-label="Work zone">
                            {draw(screen.workspace)}
                          </section>
                          <aside aria-label="Pinned review zone">
                            {draw(screen.side)}
                          </aside>
                        </div>
                      </div>
                      {screen.modal && (
                        <div
                          className="research-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-label="Clinical acknowledgment"
                        >
                          {draw([screen.modal])}
                        </div>
                      )}
                    </FieldChoicesContext.Provider>
                  </EntryHintsContext.Provider>
                </SourceLabelsContext.Provider>
              </FieldSourceContext.Provider>
            </article>
          );
        })}
      </div>
    </main>
  );
}
