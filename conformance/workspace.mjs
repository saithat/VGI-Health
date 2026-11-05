/** Private synthetic list context. Clinical facts remain exactly those supplied
 * by the scenario; selection adds only directory identities and source binding. */
export const activities = [
  ['scheduleTasks', 'Schedule'], ['edTrackBoard', 'Track Board'],
  ['shiftWorklist', 'Unit Census'], ['unitCensus', 'Unit Census'],
  ['orSchedule', 'OR Schedule'], ['consultList', 'Consults'],
  ['inboxResults', 'Inbox'], ['inboxRxRequests', 'Rx Requests'],
];
export function directory(patients) {
  return { patients, activities: activities.map(([info, title]) => ({ info, title,
    rows: patients.map(p => ({ patient: p.id, fields: [['Patient', p.name], ['MRN', p.mrn], ['Context', 'Held-out scheduled encounter']] })) })) };
}
export function selectionFacts(facts) {
  const id = facts.sourcePatientId ?? facts.patientId;
  return { ...facts, sourcePatientId: id, patientDirectory: facts.patientDirectory ?? directory([
    { id, name: `Heldout ${id}`, mrn: id },
  ]) };
}
export const emptyDisplay = {
  asOf: '', banner: { name: '', mrn: '', dob: '', ageYears: 0, sex: 'U', language: '',
    pcp: '', coverage: '', encounterClass: '', attending: '', location: '' },
  allergies: [], meds: [], vitals: [], labs: [], problems: [], immunizations: [],
  encounters: [], procedures: [], growth: [], notes: [], history: [],
};
export function nodes(value, kind) {
  if (!value || typeof value !== 'object') return [];
  return [...(value[kind] ? [value[kind]] : []), ...Object.values(value).flatMap(v => nodes(v, kind))];
}
