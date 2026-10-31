import { Badge } from '@mantine/core';
import { conceptText, type ChartData } from '../data/fhir';

export function PatientBanner({ data }: { data: ChartData }) {
  const patient = data.patient;
  const name = patient.name?.[0];
  const displayName = name?.text ?? `${name?.family ?? ''}, ${name?.given?.join(' ') ?? ''}`;
  const birth = patient.birthDate;
  const date = data.context.asOf;
  const age = birth ? Number(date.slice(0, 4)) - Number(birth.slice(0, 4)) - (date.slice(5) < birth.slice(5) ? 1 : 0) : '—';
  const mrn = patient.identifier?.find((identifier) => conceptText(identifier.type).toUpperCase() === 'MRN')?.value ?? patient.identifier?.[0]?.value ?? patient.id;
  const allergies = data.resources.filter((resource) => resource.resourceType === 'AllergyIntolerance');
  const coverage = data.resources.filter((resource) => resource.resourceType === 'Coverage').find((resource) => resource.status === 'active');
  return <section className="patient-banner" aria-label="Patient banner">
    <div className="patient-avatar" aria-label="Patient photo placeholder">{name?.given?.[0]?.[0] ?? '?'}{name?.family?.[0] ?? ''}<span>NO PHOTO</span></div>
    <div className="patient-identity"><div className="patient-title"><h1>{displayName}</h1><Badge color="gray" variant="light">{age} y · {patient.gender ?? 'Unknown sex'}</Badge></div><div className="identifiers"><strong>DOB {birth ?? 'Not recorded'}</strong><strong>MRN {mrn}</strong><span>{conceptText(patient.communication?.find((communication) => communication.preferred)?.language ?? patient.communication?.[0]?.language)}</span></div><div className="banner-badges"><Badge color={allergies.length ? 'red' : 'gray'} variant="light">Allergies: {allergies.length ? allergies.map((allergy) => conceptText(allergy.code)).join(' · ') : 'No records'}</Badge><Badge color="teal" variant="outline">{data.context.codeStatus}</Badge><Badge color="gray" variant="outline">{data.context.isolation}</Badge></div></div>
    <div className="patient-meta"><div><span>PCP</span><strong>{patient.generalPractitioner?.[0]?.display ?? 'Not recorded'}</strong></div><div><span>Coverage</span><strong>{coverage?.payor.map((payor) => payor.display ?? '—').join(', ') ?? 'Not recorded'}</strong></div><div><span>Care gaps</span><strong>{data.source === 'offline' ? `${data.context.careGaps.length} open` : 'Not loaded'}</strong></div><div><span>Critical flags</span><strong className="allergy-text">{data.context.criticalFlags.join(' · ') || (data.source === 'medplum' ? 'Not loaded' : 'None recorded')}</strong></div></div>
  </section>;
}
