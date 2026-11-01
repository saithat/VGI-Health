import { PresentationProvider } from "./presentations";
import type { PresentationBundle } from "./presentation-types";
import { useLayoutEffect, useRef } from "react";
import { AppShell, Badge, Group, Modal, Text, Title } from "@mantine/core";
import { UiChildren, type Emit } from "./nodes";
import { ClinicalIcon } from "./Icons";
import { DisplayValue } from "./display";
import { clinicalCssVariables } from "./theme";
import type { Pair, UiNode, UiScreen } from "./types";
import "./clinical.css";

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
        <span className="clinical-encounter">{viewer ?? "Patient chart"}</span>
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
                    <DisplayValue value={value || "Not recorded"} />
                  </strong>
                </span>
              ))}
          </Group>
        </div>
        <div className="patient-banner-details">
          {fields
            .filter(
              ([label]) =>
                !/^(patient|name|patient name|dob|mrn|age.*sex)$/i.test(label),
            )
            .map(([label, value]) =>
              /allerg/i.test(label) ? (
                <Badge
                  key={label}
                  color={
                    !value.trim() ||
                    /not recorded|no allergy records|not reviewed/i.test(value)
                      ? "yellow"
                      : /no known|nkda/i.test(value)
                        ? "gray"
                        : "red"
                  }
                  variant="light"
                  className="allergy-badge"
                  size="lg"
                >
                  {label}: <DisplayValue value={value || "Not recorded"} />
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
                    <DisplayValue value={value || "Not recorded"} />
                  </strong>
                </span>
              ),
            )}
        </div>
      </div>
    </AppShell.Header>
  );
}
export function WorkflowNav({
  groups,
  onEvent,
  title,
}: {
  groups: UiScreen["nav"];
  onEvent: Emit;
  title?: string;
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
      <Text
        className="nav-eyebrow"
        size="xs"
        fw={700}
        c="dimmed"
        mb={available.length ? "sm" : 0}
      >
        PATIENT WORKSPACE
      </Text>
      <div className="workflow-groups">
        {available.map(([group, items]) => (
          <section key={group} className="workflow-group" aria-label={group}>
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
              {group}
            </h2>
            <ul className="workflow-links" aria-label={`${group} screens`}>
              {items.map(([id, label]) => (
                <li key={id}>
                  <button
                    type="button"
                    className="clinical-nav-link"
                    data-comp-id={id}
                    data-event="click"
                    aria-current={label === title ? "page" : undefined}
                    onClick={() => onEvent({ click: { comp: id } })}
                  >
                    <span aria-hidden="true" className="nav-dot" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="nav-footer">
        <span className="status-dot" aria-hidden="true" />
        <Text size="xs">Encounter workspace</Text>
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
  const shellRef = useRef<HTMLDivElement | null>(null);
  const stepper = screen.workspace.find((node) => "stepper" in node);
  const active =
    stepper && "stepper" in stepper
      ? stepper.stepper.steps[stepper.stepper.current]?.[0]
      : undefined;
  // A new screen starts at its heading. Ordinary field updates retain position.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
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
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.style.scrollPaddingTop = previousPadding;
    };
  }, []);
  return (
    <AppShell
      className="clinical-app"
      style={{ ...clinicalCssVariables }}
      header={{ height: 104 }}
      navbar={{ width: 224, breakpoint: 0 }}
      padding="md"
    >
      <div
        className={`clinical-shell${screen.nav.some(([, items]) => items.length) ? "" : " without-nav"}`}
        aria-hidden={modal ? true : undefined}
        ref={(element) => {
          shellRef.current = element;
          if (element) element.inert = Boolean(modal);
        }}
      >
        <PatientBanner fields={bannerFields(screen)} viewer={viewer} />
        <WorkflowNav
          key={`${active ?? ""}:${screen.title}`}
          groups={screen.nav}
          onEvent={onEvent}
          title={screen.title}
        />
        <AppShell.Main>
          <div className="clinical-workspace-heading">
            <div>
              <Text size="xs" c="dimmed" mb={3}>
                PATIENT CHART <span aria-hidden="true"> / </span> ENCOUNTER
              </Text>
              <Title order={1}>{screen.title}</Title>
            </div>
            <Badge color="gray" size="md">
              Patient chart
            </Badge>
          </div>
          <div
            className={`clinical-workspace${screen.side.length ? " with-side" : ""}`}
          >
            {screen.side.length > 0 && (
              <aside aria-label="Clinical summary" className="clinical-side">
                <UiChildren nodes={screen.side} onEvent={onEvent} />
              </aside>
            )}
            <div className="clinical-workspace-body">
              <UiChildren nodes={screen.workspace} onEvent={onEvent} />
            </div>
          </div>
          <div className="workspace-footer">
            VGI Health <span aria-hidden="true">·</span> Clinical encounter
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
                <UiChildren nodes={[modal]} onEvent={onEvent} />
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
      <StockUiScreenView
        screen={props.screen}
        onEvent={props.onEvent}
        viewer={props.viewer}
      />
    </PresentationProvider>
  );
}
