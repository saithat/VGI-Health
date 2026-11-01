import { Accordion, AppShell, Badge, Group, Modal, Text, Title } from "@mantine/core";
import { UiChildren, type Emit } from "./nodes";
import type { Pair, UiNode, UiScreen } from "./types";
import "./clinical.css";

function bannerValue(banner: Pair[], pattern: RegExp) {
  return banner.find(([label]) => pattern.test(label))?.[1];
}
function modalTitle(node: UiNode): string | undefined {
  if ("section" in node) return node.section.title;
  if ("alert" in node) return node.alert.label;
  if ("columns" in node) return node.columns.children.map(modalTitle).find(Boolean);
  return undefined;
}
export function PatientBanner({ fields }: { fields: Pair[] }) {
  const name = bannerValue(fields, /^(patient|name|patient name)$/i);
  const initial = name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") ?? "PT";
  return <AppShell.Header component="header" aria-label="Patient banner" className="clinical-banner">
    <div className="clinical-brand"><span className="brand-mark" aria-hidden="true">✚</span><strong>VGI <span>HEALTH</span></strong><span className="clinical-brand-divider" /><span>Clinical workspace</span><span className="clinical-encounter">Patient chart</span></div>
    <div className="clinical-banner-content"><div className="patient-avatar" aria-hidden="true">{initial}</div><div className="patient-identity"><Text component="span" className="patient-name">{name ?? "Patient chart"}</Text><Group gap={14} mt={3}>{fields.filter(([label]) => /^(dob|mrn|age.*sex)$/i.test(label)).map(([label, value]) => <span key={label}><span className="banner-label">{label} </span><strong>{value || "Not recorded"}</strong></span>)}</Group></div>
      <div className="patient-banner-details">{fields.filter(([label]) => !/^(patient|name|patient name|dob|mrn|age.*sex)$/i.test(label)).map(([label, value]) => /allerg/i.test(label) ? <Badge key={label} color={/no known|nkda/i.test(value) ? "teal" : "red"} variant="filled" className="allergy-badge" size="lg">{label}: {value || "Not recorded"}</Badge> : <span key={label} className="banner-detail"><span className="banner-label">{label}</span><strong>{value || "Not recorded"}</strong></span>)}</div>
    </div>
  </AppShell.Header>;
}
export function WorkflowNav({ groups, title }: { groups: UiScreen["nav"]; title: string }) {
  return <AppShell.Navbar component="nav" aria-label="Clinical workflows" className="clinical-navbar" p="sm">
    <Text className="nav-eyebrow" size="xs" fw={700} c="dimmed" mb="sm">PATIENT WORKSPACE</Text>
    <Accordion multiple defaultValue={groups.map(([label]) => label)} chevronPosition="right" variant="default" className="workflow-groups">
      {groups.map(([group, items]) => <Accordion.Item key={group} value={group}><Accordion.Control>{group}</Accordion.Control><Accordion.Panel>
        <ul className="workflow-links">{items.map(([id, label]) => <li key={id} aria-current={label === title ? "page" : undefined}><span aria-hidden="true" className="nav-dot" />{label}</li>)}</ul>
      </Accordion.Panel></Accordion.Item>)}
    </Accordion>
    <div className="nav-footer"><span className="status-dot" aria-hidden="true" /><Text size="xs">Encounter workspace</Text></div>
  </AppShell.Navbar>;
}
/** Presentation only. Clinical state, permitted actions and values belong to Lean. */
export function UiScreenView({ screen, onEvent }: { screen: UiScreen; onEvent: Emit }) {
  const modal = screen.modal;
  return <AppShell className="clinical-app" header={{ height: 122 }} navbar={{ width: 208, breakpoint: 0 }} padding="md">
    <PatientBanner fields={screen.banner} />
    <WorkflowNav groups={screen.nav} title={screen.title} />
    <AppShell.Main>
      <div className="clinical-workspace-heading"><div><Text size="xs" c="dimmed" mb={3}>PATIENT CHART <span aria-hidden="true"> / </span> ENCOUNTER</Text><Title order={1}>{screen.title}</Title></div><Badge variant="dot" color="teal" size="md">Active encounter</Badge></div>
      <div className={`clinical-workspace${screen.side.length ? " with-side" : ""}`}>
        <div className="clinical-workspace-body"><UiChildren nodes={screen.workspace} onEvent={onEvent} /></div>
        {screen.side.length > 0 && <aside aria-label="Clinical summary" className="clinical-side"><UiChildren nodes={screen.side} onEvent={onEvent} /></aside>}
      </div>
      <div className="workspace-footer">VGI Health <span aria-hidden="true">·</span> Clinical encounter</div>
    </AppShell.Main>
    <Modal opened={modal !== null} onClose={() => {}} title={modal ? modalTitle(modal) ?? "Clinical alert" : "Clinical alert"} withCloseButton={false} closeOnClickOutside={false} closeOnEscape={false} centered size="lg" overlayProps={{ backgroundOpacity: 0.42, blur: 2 }} classNames={{ content: "clinical-modal", title: "clinical-modal-title" }} transitionProps={{ duration: 0 }}>
      {modal && <div className="clinical-modal-body"><UiChildren nodes={[modal]} onEvent={(event) => {
        // Interruptive UI carries an alert id; acknowledgement is never a commit.
        const alertId = findAlert(modal);
        if (alertId && "click" in event) onEvent({ ack: { alert: alertId } });
        else onEvent(event);
      }} /></div>}
    </Modal>
  </AppShell>;
}
function findAlert(node: UiNode): string | undefined {
  if ("alert" in node) return node.alert.alertId;
  if ("section" in node) return node.section.children.map(findAlert).find(Boolean);
  if ("columns" in node) return node.columns.children.map(findAlert).find(Boolean);
  return undefined;
}
