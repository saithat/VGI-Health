import { CompactContext } from "./Density";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Event } from "../../../../lean/generated/ehr-types";
import type { NodeOf, UiNode } from "./types";
import { UiChildren } from "./nodes";
import "./urgent-strip.css";
import { FieldSourceContext } from "./clinical-metadata";
import { EntryHintsContext, SourceLabelsContext } from "./SourceLabels";
import { FieldChoicesContext } from "./FieldChoices";

export type BoardEvent = { patient: string; event: Event };
export const BoardEvents = createContext<((event: BoardEvent) => void) | null>(
  null,
);
const ModalOwner = createContext<string | null>(null);

/** Render only the native board node. All events retain their patient namespace. */
export function Board({
  node,
  render,
}: {
  node: NodeOf<"board">;
  render: (child: UiNode, index: number) => ReactNode;
}) {
  const dispatch = useContext(BoardEvents);
  const board = useRef<HTMLElement>(null);
  const rail = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const update = () => {
      if (board.current && rail.current)
        board.current.style.setProperty(
          "--board-modal-top",
          `${Math.max(board.current.getBoundingClientRect().top, rail.current.getBoundingClientRect().bottom) + 8}px`,
        );
    };
    update();
    const observer = new ResizeObserver(update);
    if (rail.current) observer.observe(rail.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [node.urgent]);
  const owner = node.children.find(
    (n) => "patientPane" in n && n.patientPane.modal.length > 0,
  );
  return (
    <ModalOwner.Provider
      value={owner && "patientPane" in owner ? owner.patientPane.patient : null}
    >
      <section
        ref={board}
        className="clinical-board"
        role={owner ? "dialog" : "region"}
        aria-modal={owner ? true : undefined}
        aria-label="Multi-patient board"
      >
        <aside
          ref={rail}
          className="board-urgency"
          aria-label="Urgent patients"
          aria-live="polite"
        >
          {node.urgent.map((d, i) => (
            <div
              key={i}
              role="alert"
              data-urgent-patient={d.patient}
              data-alert-id={d.alertId}
              data-severity={d.severity}
            >
              <strong>
                {d.banner.find(([key]) => key === "Patient")?.[1] ?? d.patient}
              </strong>
              {" · "}
              {d.banner.find(([key]) => key === "MRN")?.[1]} · {d.label}
            </div>
          ))}
          {node.children
            .flatMap((n) =>
              "patientPane" in n && n.patientPane.metadata.urgent?.length
                ? [n.patientPane]
                : [],
            )
            .map((pane) => (
              <section
                key={pane.patient}
                className="urgent-alert-strip board-native-strip"
                data-urgent-strip-patient={pane.patient}
                aria-label={`Urgent clinical alerts for ${pane.patient}`}
              >
                <strong>
                  {pane.banner.find(([key]) => key === "Patient")?.[1] ??
                    pane.patient}{" "}
                  · {pane.banner.find(([key]) => key === "MRN")?.[1]}
                </strong>
                <CompactContext.Provider value={pane.metadata.compact ?? []}>
                  <UiChildren
                    nodes={(pane.metadata.urgent ?? []).map((n) =>
                      "button" in n &&
                      owner &&
                      "patientPane" in owner &&
                      owner.patientPane.patient !== pane.patient
                        ? {
                            button: {
                              ...n.button,
                              enabled: false,
                              blockedReason:
                                "Another patient's clinical acknowledgment owns interaction",
                            },
                          }
                        : n,
                    )}
                    onEvent={(event) => {
                      if (
                        !owner ||
                        ("patientPane" in owner &&
                          owner.patientPane.patient === pane.patient)
                      )
                        dispatch?.({ patient: pane.patient, event });
                    }}
                  />
                </CompactContext.Provider>
              </section>
            ))}
        </aside>
        <div className="board-panes">{node.children.map(render)}</div>
      </section>
    </ModalOwner.Provider>
  );
}

/** Duplicate visual identifiers stay pinned; the complete accessible banner stays
in flow. Long allergy/encounter detail cannot occlude clinical controls. */
function PatientIdentity({
  banner,
}: {
  banner: NodeOf<"patientPane">["banner"];
}) {
  return banner.length ? (
    <div className="board-identity" aria-hidden="true">
      {banner
        .filter(([key]) => key === "Patient" || key === "MRN")
        .map(([key, value]) => (
          <span key={key}>
            <small>{key}</small>
            <strong>{value}</strong>
          </span>
        ))}
    </div>
  ) : null;
}

export function PatientPane({
  node,
  render,
}: {
  node: NodeOf<"patientPane">;
  render: (children: UiNode[], emit: (event: Event) => void) => ReactNode;
}) {
  const dispatch = useContext(BoardEvents);
  const owner = useContext(ModalOwner);
  const emit = (event: Event) => {
    if (dispatch && (owner === null || owner === node.patient))
      dispatch({ patient: node.patient, event });
  };
  // useId in ordinary controls remains globally unique, including repeated comp IDs.
  return (
    <article
      role="region"
      data-patient={node.patient}
      aria-label={`Patient ${node.patient}`}
    >
      <PatientIdentity banner={node.banner} />
      <div
        className="board-banner"
        role="region"
        aria-label={node.banner.length ? "Patient banner" : "Patient selection"}
      >
        {!node.banner.length && <span>Patient selection</span>}
        {node.banner.map(([key, value], i) => (
          <span key={i}>
            <small>{key}</small>
            {value}
          </span>
        ))}
      </div>
      <CompactContext.Provider value={node.metadata.compact ?? []}>
        <FieldSourceContext.Provider
          value={new Map(node.metadata.fieldSources)}
        >
          <SourceLabelsContext.Provider value={node.metadata.sourceLabels}>
            <EntryHintsContext.Provider value={node.metadata.entryHints}>
              <FieldChoicesContext.Provider value={node.metadata.fieldChoices}>
                <div
                  aria-hidden={
                    node.modal.length > 0 ||
                    (owner !== null && owner !== node.patient) ||
                    !dispatch ||
                    undefined
                  }
                  ref={(el) => {
                    if (el)
                      el.inert =
                        node.modal.length > 0 ||
                        (owner !== null && owner !== node.patient) ||
                        !dispatch;
                  }}
                >
                  {render(node.children, emit)}
                </div>
                {node.modal.length > 0 && owner === node.patient && (
                  <section
                    className="board-modal"
                    role="region"
                    aria-label={`Clinical acknowledgment for ${node.patient}`}
                  >
                    <PatientIdentity banner={node.banner} />
                    {render(node.modal, emit)}
                  </section>
                )}
              </FieldChoicesContext.Provider>
            </EntryHintsContext.Provider>
          </SourceLabelsContext.Provider>
        </FieldSourceContext.Provider>
      </CompactContext.Provider>
    </article>
  );
}
