/** Fixed semantic patient picker around the unchanged certified program. */
import { atoms } from '../app/scripts/exotic-gate.mjs';
export function patientBound(input) {
  if (input.program.patientSelection !== true) return true;
  const c=input.state.patientContext;
  return Boolean(c?.patient && c.patient===c.bound && c.patient===input.facts.sourcePatientId);
}
export function hydrationEvent(input) {
  const c=input.state.patientContext;
  return input.program.patientSelection===true && c?.patient===input.facts.sourcePatientId && c?.patient && c.bound!==c.patient ? {scroll:{screen:input.state.screen}} : null;
}
export function workspaceChoice(input, screen) {
  const source=input.facts.sourcePatientId;
  if(!source)throw Error('Patient selection requires the actual FHIR source key');
  const buttons=atoms([...screen.workspace,...screen.side]).flatMap(n=>'button'in n?[n.button]:[])
    .concat(screen.nav.flatMap(([,pairs])=>pairs.map(([comp,label])=>({comp,label,enabled:true}))));
  const open=buttons.find(c=>c.enabled&&c.comp.startsWith(`workspace.open|${source}|`));
  if(open)return {label:open.label,event:{click:{comp:open.comp}}};
  const desired=buttons.find(c=>c.comp==='workspace.activity|edTrackBoard')??buttons.find(c=>c.comp==='workspace.return');
  if(desired)return {label:desired.label,event:{click:{comp:desired.comp}}};
  const field=atoms(screen.workspace).find(n=>'field'in n&&n.field.comp==='workspace.search');
  const patient=input.facts.patientDirectory?.patients.find(p=>p.id===source);
  if(field&&patient?.mrn&&input.state.patientContext?.query!==patient.mrn)
    return {label:'Find the assigned patient by MRN',event:{enter:{comp:'workspace.search',value:{text:{s:patient.mrn}}}}};
  throw Error(`Assigned patient is unavailable in the native picker: ${source}`);
}
/** Setup for another already-open pane, using actual guarded open/bind events. */
export function boundInitial(call,input) {
  let state=call('ehr_init_envelope',input);
  for(let i=0;i<8;i++){
    const current={...input,state},hydrate=hydrationEvent(current);
    if(hydrate){state=call('ehr_step_envelope',{...current,event:hydrate}).state;continue;}
    if(patientBound(current))return state;
    const screen=call('ehr_exotic',{op:'render',render:current}).screen;
    const {event}=workspaceChoice(current,screen);
    const result=call('ehr_step_envelope',{...current,event});
    if(result.result!=='ok')throw Error('Native patient initialization rejected');
    state=result.state;
  }
  throw Error('Native patient initialization exceeded its setup bound');
}
