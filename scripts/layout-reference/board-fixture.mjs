// Repeated component IDs are intentional. The patient namespace comes only
// from the enclosing pane, as it does for two sessions on the same Program.
export function boardPatients({ modal = false } = {}) {
  return ['Ada', 'Blair'].map((patient, index) => {
    const button = (comp, role) => ({button: {
      comp, role, label: comp, enabled: true, blockedReason: null, hotkey: null,
    }});
    const alert = {alert: {comp: 'warning', alertId: 'urgent-result', label: 'Urgent result', severity: 'interruptive'}};
    const rows = Array.from({length: 20}, (_, i) =>
      Array.from({length: 10}, (_, col) => ['Column ' + col, patient + ' ' + i]));
    return {patient, screen: {
      screen: 'track', banner: [['Patient', patient]], nav: [], title: 'ED track board', side: [],
      workspace: [{presentation: {kind: 'trackBoard', children: [
        {info: {comp: 'table', infoId: 'edTrackBoard', label: 'Patients', display: 'table', rows}},
        ...rows.map((_, row) => ({rowAction: {target: 'table', row, children: [button('open-' + row, 'nav')]}})),
      ]}}, button('sign', 'primary')],
      urgent: [alert, button('ack', 'ack')],
      modal: modal && index === 1 ? {section: {id: 'dialog', title: 'Review', children: [alert, button('review', 'ack')]}} : null,
    }};
  });
}
