import { PresentationProvider } from "./presentations";
import type { PresentationBundle } from "./presentation-types";
import { useLayoutEffect } from "react";
import { AppShell, Badge, Group, Modal, Text, Title } from "@mantine/core";
import { UiChildren, type Emit } from "./nodes";
import { ClinicalIcon } from "./Icons";
import { DisplayValue } from "./display";
import { clinicalCssVariables } from "./theme";
import { EntryHintsContext, SourceLabelsContext } from "./SourceLabels";
import type { Pair, UiNode, UiScreen } from "./types";
import "./clinical.css";

function bannerValue(banner: Pair[], pattern: RegExp) {
  return banner.find(([label]) => pattern.test(label))?.[1];
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
export function PatientBanner({ fields }: { fields: Pair[] }) {
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
        <span className="clinical-encounter">Patient chart</span>
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
                <span key={label} className="banner-detail">
                  <span className="banner-label">{label}</span>
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
  active,
  onEvent,
}: {
  groups: UiScreen["nav"];
  active: string | undefined;
  onEvent: Emit;
}) {
  return (
    <AppShell.Navbar
      component="nav"
      aria-label="Clinical workflows"
      className="clinical-navbar"
      p="sm"
    >
      <Text className="nav-eyebrow" size="xs" fw={700} c="dimmed" mb="sm">
        PATIENT WORKSPACE
      </Text>
      <div className="workflow-groups">
        {groups.map(([group, items]) => (
          <div key={group}>
            <Text className="clinical-nav-group-title" fw={600}>
              {group}
            </Text>
            <ul className="workflow-links" aria-label={`${group} screens`}>
              {items.map(([id, label]) => (
                <li key={id} aria-current={id === active ? "page" : undefined}>
                  <button
                    type="button"
                    aria-current={id === active ? "page" : undefined}
                    data-comp-id={id}
                    data-event="click"
                    onClick={() => onEvent({ click: { comp: id } })}
                  >
                    <span aria-hidden="true" className="nav-dot" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
}: {
  screen: UiScreen;
  onEvent: Emit;
}) {
  const modal = screen.modal;
  const active = screen.activeNav;
  const draw = (nodes: UiNode[]) => (
    <SourceLabelsContext.Provider value={screen.sourceLabels ?? []}>
      <EntryHintsContext.Provider value={screen.entryHints ?? []}>
        <UiChildren nodes={nodes} onEvent={onEvent} />
      </EntryHintsContext.Provider>
    </SourceLabelsContext.Provider>
  );
  // A new screen starts at its heading. Ordinary field updates retain position.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [active, screen.title]);
  return (
    <AppShell
      className="clinical-app"
      style={{ ...clinicalCssVariables }}
      header={{ height: 104 }}
      navbar={{ width: 224, breakpoint: 0 }}
      padding="md"
    >
      <div
        className="clinical-shell"
        aria-hidden={modal ? true : undefined}
        ref={(element) => {
          if (element) element.inert = Boolean(modal);
        }}
      >
        <PatientBanner fields={bannerFields(screen)} />
        <WorkflowNav
          key={active}
          groups={screen.nav}
          active={active}
          onEvent={onEvent}
        />
        <AppShell.Main>
          <div className="clinical-workspace-heading">
            <div>
              <Text size="xs" c="dimmed" mb={3}>
                PATIENT CHART <span aria-hidden="true"> / </span> ENCOUNTER
              </Text>
              <Title order={1}>{screen.title}</Title>
            </div>
          </div>
          <div
            className={`clinical-workspace${screen.side.length ? " with-side" : ""}`}
          >
            {screen.side.length > 0 && (
              <aside aria-label="Clinical summary" className="clinical-side">
                {draw(screen.side)}
              </aside>
            )}
            <div className="clinical-workspace-body">
              {draw(screen.workspace)}
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
                {draw([modal])}
              </div>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </AppShell>
  );
}

export function UiScreenView(props: { screen: UiScreen; onEvent: Emit; presentations?: PresentationBundle | null }) {
  return <PresentationProvider bundle={props.presentations ?? null}><StockUiScreenView screen={props.screen} onEvent={props.onEvent} /></PresentationProvider>;
}
