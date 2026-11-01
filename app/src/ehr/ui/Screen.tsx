import { sectionTone } from "./display";
import { PresentationProvider } from "./presentations";
import type { PresentationBundle } from "./presentation-types";
import { useLayoutEffect, useRef } from "react";
import { AppShell, Badge, Group, Modal, Text, Title } from "@mantine/core";
import { UiChildren, type Emit } from "./nodes";
import { FieldSourceContext } from "./clinical-metadata";
import { ClinicalIcon } from "./Icons";
import { DisplayValue } from "./display";
import { allergyDisplay, sectionCaption } from "./clinical-display";
import { ageSex, encounterClass } from "./clinical-formatters";
import { clinicalCssVariables } from "./theme";
import { EntryHintsContext, SourceLabelsContext } from "./SourceLabels";
import { FieldChoicesContext } from "./FieldChoices";
import type { Pair, UiNode, UiScreen } from "./types";
import "./clinical.css";
import "./dense-shell.css";

function bannerValue(banner: Pair[], pattern: RegExp) {
  return banner.find(([label]) => pattern.test(label))?.[1];
}
function isolationPrecaution(label: string, value: string) {
  return (
    /isolation/i.test(label) &&
    !/^(not recorded|not documented|unknown|none|no isolation(?: precautions)?|standard(?: precautions)?)?$/i.test(
      value.trim(),
    )
  );
}
/** Decorative shortcuts follow the supplied clinical activity name. */
export function activityIcon(
  label: string,
): Parameters<typeof ClinicalIcon>[0]["name"] {
  if (/lookup|search/i.test(label)) return "search";
  if (/\bmar\b|medication|orders/i.test(label)) return "pill";
  if (/flowsheet|summary|index/i.test(label)) return "grid";
  if (/result|lab/i.test(label)) return "flask";
  if (/growth|vital/i.test(label)) return "trend";
  if (/schedule/i.test(label)) return "calendar";
  if (/track board|census/i.test(label)) return "bed";
  if (/worklist|sign|assessment|plan/i.test(label)) return "checklist";
  if (/basket|message/i.test(label)) return "message";
  if (/chart review|note|history/i.test(label)) return "document";
  return "user";
}
function modalTitle(node: UiNode): string | undefined {
  if ("section" in node) return node.section.title;
  if ("alert" in node) return node.alert.label;
  if ("columns" in node)
    return node.columns.children.map(modalTitle).find(Boolean);
  return undefined;
}
function bannerFields(screen: UiScreen): Pair[] {
  const fields = [...screen.banner];
  if (!fields.some(([label]) => /allerg/i.test(label))) {
    const rows = screen.side.flatMap((node) =>
      "info" in node && node.info.infoId === "allergyList"
        ? node.info.rows
        : [],
    );
    const names = rows.flatMap((row) =>
      row
        .filter(([key]) => /substance|allergen/i.test(key))
        .map(([, value]) => value),
    );
    fields.unshift([
      "Allergies",
      names.length ? names.join(" · ") : "Not recorded",
    ]);
  }
  if (!fields.some(([label]) => /code status/i.test(label)))
    fields.push(["Code status", "Not recorded"]);
  return fields;
}
export function PatientBanner({
  fields,
  viewer,
}: {
  fields: Pair[];
  viewer?: string | undefined;
}) {
  const name = bannerValue(fields, /^(patient|name|patient name)$/i);
  return (
    <AppShell.Header
      component="header"
      aria-label="Patient banner"
      className="clinical-banner"
    >
      <div className="clinical-brand">
        <span className="brand-mark" aria-hidden="true">
          <ClinicalIcon name="pill" />
        </span>
        <strong>
          VGI <span>HEALTH</span>
        </strong>
        <span className="clinical-brand-divider" />
        <span>Clinical workspace</span>
        {viewer && <span className="clinical-encounter">{viewer}</span>}
      </div>
      <div className="clinical-banner-content">
        <div className="patient-avatar" aria-hidden="true">
          <ClinicalIcon name="user" size={20} />
        </div>
        <div className="patient-identity">
          <Text component="span" className="patient-name">
            {name ?? "Patient chart"}
          </Text>
          <Group gap={12} mt={4}>
            {fields
              .filter(([label]) => /^(dob|mrn|age.*sex)$/i.test(label))
              .map(([label, value]) => (
                <span key={label}>
                  <span className="banner-label">{label} </span>
                  <strong>
                    <span title={value} aria-label={value}>
                      <DisplayValue
                        value={
                          /age.*sex/i.test(label)
                            ? ageSex(value)
                            : value || "Not recorded"
                        }
                      />
                    </span>
                  </strong>
                </span>
              ))}
          </Group>
        </div>
        <div className="patient-banner-details">
          {fields
            .filter(
              ([label, value]) =>
                !/^(patient|name|patient name|dob|mrn|age.*sex)$/i.test(
                  label,
                ) &&
                (/allerg/i.test(label) ||
                  !/^(?:not recorded|not documented|unknown)?$/i.test(
                    value.trim(),
                  )),
            )
            .map(([label, value]) =>
              /allerg/i.test(label) ? (
                <Badge
                  key={label}
                  color={
                    allergyDisplay(value) === "Allergies not on file"
                      ? "yellow"
                      : /^No Known (?:Drug )?Allergies(?: \([^()]+\))?$/.test(
                            allergyDisplay(value),
                          )
                        ? "gray"
                        : "red"
                  }
                  variant="light"
                  data-allergy-state={
                    allergyDisplay(value) === "Allergies not on file"
                      ? "unknown"
                      : /^No Known (?:Drug )?Allergies/.test(
                            allergyDisplay(value),
                          )
                        ? "none"
                        : "recorded"
                  }
                  className={`allergy-badge${allergyDisplay(value) === "Allergies not on file" ? " allergy-unknown" : ""}`}
                  size="lg"
                  title={value}
                  aria-label={`${label}: ${value}`}
                >
                  {/^(?:Allergies not on file|No Known (?:Drug )?Allergies)/.test(
                    allergyDisplay(value),
                  )
                    ? allergyDisplay(value)
                    : `${label}: ${allergyDisplay(value)}`}
                </Badge>
              ) : (
                <span
                  key={label}
                  className={`banner-detail${/code|isolation|weight/i.test(label) ? " banner-pill" : ""}${isolationPrecaution(label, value) ? " banner-precaution" : ""}`}
                >
                  <span className="banner-label">
                    {isolationPrecaution(label, value) && (
                      <ClinicalIcon name="warning" size={12} />
                    )}{" "}
                    {label}
                  </span>
                  <strong>
                    <span title={value} aria-label={value}>
                      <DisplayValue
                        value={encounterClass(value) || "Not recorded"}
                      />
                    </span>
                  </strong>
                </span>
              ),
            )}
          <div className="banner-missing">
            {fields
              .filter(
                ([label, value]) =>
                  !/allerg|^(patient|name|patient name|dob|mrn|age.*sex)$/i.test(
                    label,
                  ) &&
                  /^(?:not recorded|not documented|unknown)?$/i.test(
                    value.trim(),
                  ),
              )
              .map(([label, value], index) => (
                <span
                  key={label}
                  title={`${label}: ${value}`}
                  aria-label={`${label}: ${value}`}
                >
                  {index > 0 && " · "}
                  {/code status/i.test(label)
                    ? "No code status order"
                    : `${label}: ${value || "Not recorded"}`}
                </span>
              ))}
          </div>
        </div>
      </div>
    </AppShell.Header>
  );
}
export function WorkflowNav({
  groups,
  active,
  onEvent,
}: {
  groups: UiScreen["nav"];
  active: string | undefined;
  onEvent: Emit;
}) {
  const available = groups.filter(([, items]) => items.length > 0);
  if (!available.length) return null;
  return (
    <AppShell.Navbar
      component="nav"
      aria-label="Clinical navigation"

      className={`clinical-navbar${available.length ? "" : " empty-navigator"}`}
      p="sm"
    >
      <div className="workflow-groups">
        {available.map(([group, items]) => (
          <section
            key={group}
            className="workflow-group"
            data-nav-kind={
              items.every(([id]) => id.startsWith("workspace."))
                ? "application"
                : "chart"
            }
            data-section-tone={sectionTone(group)}
            aria-label={group}
          >
            <h2 className="nav-group-title">
              <ClinicalIcon
                name={
                  /basket|result|request/i.test(group)
                    ? "message"
                    : /med|mar/i.test(group)
                      ? "pill"
                      : /schedule|round|surg/i.test(group)
                        ? "clock"
                        : "user"
                }
              />
              {sectionCaption(group)}
            </h2>
            <ul className="workflow-links" aria-label={`${group} screens`}>
              {items.map(([id, label]) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={id === active ? "page" : undefined}
                    className="clinical-nav-link"
                    data-section-tone={sectionTone(label)}
                    data-comp-id={id}
                    data-event="click"
                    aria-label={label}
                    onClick={() => onEvent({ click: { comp: id } })}
                  >
                    <ClinicalIcon name={activityIcon(label)} size={14} />
                    {sectionCaption(label)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell.Navbar>
  );
}
/** Presentation only. Clinical state, permitted actions and values belong to Lean. */
function StockUiScreenView({
  screen,
  onEvent,
  viewer,
}: {
  screen: UiScreen;
  onEvent: Emit;
  viewer?: string | undefined;
}) {
  const modal = screen.modal;
  const active = screen.activeNav;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mainScroll = useRef<HTMLElement | null>(null);
  const draw = (nodes: UiNode[]) => (
    <SourceLabelsContext.Provider value={screen.sourceLabels ?? []}>
      <EntryHintsContext.Provider value={screen.entryHints ?? []}>
        <FieldChoicesContext.Provider value={screen.fieldChoices ?? []}>
          <UiChildren nodes={nodes} onEvent={onEvent} />
        </FieldChoicesContext.Provider>
      </EntryHintsContext.Provider>
    </SourceLabelsContext.Provider>
  );
  // A new screen starts at its heading. Ordinary field updates retain position.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    mainScroll.current?.scrollTo?.(0, 0);
  }, [screen.screen, active, screen.title]);
  // Geometry only: preserve patient identity above a long chart without hiding
  // a tall banner on a small viewport. No clinical state is derived here.
  useLayoutEffect(() => {
    const shell = shellRef.current;
    const header = shell?.querySelector<HTMLElement>(".clinical-banner");
    if (!shell || !header) return;
    const root = document.documentElement;
    const previousPadding = root.style.scrollPaddingTop;
    const measure = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      const pinned =
        window.innerWidth >= 1100 && height < window.innerHeight * 0.45;
      shell.dataset.pinned = String(pinned);
      shell.style.setProperty("--clinical-header-height", `${height}px`);
      root.style.scrollPaddingTop = pinned
        ? `${height + 12}px`
        : previousPadding;
      const status = shell.querySelector<HTMLElement>(".workspace-footer");
      shell.style.setProperty(
        "--clinical-status-height",
        `${Math.ceil(status?.getBoundingClientRect().height ?? 24)}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    const status = shell.querySelector<HTMLElement>(".workspace-footer");
    if (status) observer.observe(status);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.style.scrollPaddingTop = previousPadding;
    };
  }, [screen.banner.length > 0]);
  return (
    <AppShell
      className="clinical-app"
      style={{ ...clinicalCssVariables }}
      header={{ height: 104 }}
      navbar={{ width: 224, breakpoint: 0 }}
      padding="md"
    >
      <div
        className={`clinical-shell${screen.nav.some(([, items]) => items.length) ? "" : " without-nav"}${screen.banner.length ? " patient-open" : " department-open"}`}
        aria-hidden={modal ? true : undefined}
        ref={(element) => {
          shellRef.current = element;
          if (element) element.inert = Boolean(modal);
        }}
      >
        {screen.banner.length > 0 ? (
          <PatientBanner
            fields={bannerFields(screen)}
            viewer={viewer ?? screen.viewer}
          />
        ) : (
          <AppShell.Header
            component="header"
            aria-label="Application toolbar"
            className="clinical-banner"
          >
            <div className="clinical-brand">
              <strong>VGI HEALTH</strong>
              <span>Clinical workspace</span>
              <span>{viewer ?? screen.viewer}</span>
            </div>
          </AppShell.Header>
        )}
        <WorkflowNav
          key={active}
          groups={screen.nav}
          active={active}
          onEvent={onEvent}
        />
        <AppShell.Main
          ref={(element) => {
            mainScroll.current = element;
          }}
        >
          <div className="clinical-workspace-heading">
            <div>
              <Title order={1} title={screen.title}>
                {sectionCaption(screen.title)}
              </Title>
            </div>
          </div>
          <div
            className={`clinical-workspace${screen.side.length ? " with-side" : ""}`}
          >
            {screen.side.length > 0 && (
              <aside aria-label="Clinical summary" className="clinical-side">
                {screen.banner.length > 0 && (
                  <div className="storyboard-avatar" aria-hidden="true">
                    <ClinicalIcon name="user" size={32} />
                  </div>
                )}
                {draw(screen.side)}
              </aside>
            )}
            <div className="clinical-workspace-body">
              {draw(screen.workspace)}
            </div>
          </div>
          <div className="workspace-footer">
            <span>{viewer ?? screen.viewer ?? "VGI Health"}</span>
            {screen.banner
              .filter(([label]) =>
                /^(encounter|encounter type|location|department)$/i.test(label),
              )
              .map(([label, value]) => (
                <span key={label} title={`${label}: ${value}`}>
                  {label}: <DisplayValue value={value} />
                </span>
              ))}
          </div>
        </AppShell.Main>
      </div>
      <Modal.Root
        opened={modal !== null}
        onClose={() => {}}
        closeOnClickOutside={false}
        closeOnEscape={false}
        centered
        size="lg"
        classNames={{
          content: "clinical-modal",
          title: "clinical-modal-title",
        }}
        transitionProps={{ duration: 0 }}
      >
        <Modal.Overlay backgroundOpacity={0.24} />
        <Modal.Content style={{ ...clinicalCssVariables }}>
          <Modal.Header role="presentation">
            <Modal.Title>
              {modal
                ? (modalTitle(modal) ?? "Clinical alert")
                : "Clinical alert"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {modal && (
              <div className="clinical-modal-body" data-autofocus tabIndex={-1}>
                {draw([modal])}
              </div>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </AppShell>
  );
}

export function UiScreenView(props: {
  screen: UiScreen;
  onEvent: Emit;
  viewer?: string | undefined;
  presentations?: PresentationBundle | null;
}) {
  return (
    <PresentationProvider bundle={props.presentations ?? null}>
      <FieldSourceContext.Provider
        value={new Map(props.screen.fieldSources ?? [])}
      >
        <StockUiScreenView
          screen={props.screen}
          onEvent={props.onEvent}
          viewer={props.viewer}
        />
      </FieldSourceContext.Provider>
    </PresentationProvider>
  );
}
