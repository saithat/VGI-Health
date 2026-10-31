import { Alert, Badge, Button, NativeSelect, Paper } from '@mantine/core';
import { SignInForm } from '@medplum/react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { createMockInterp } from './core/interp';
import { createSession } from './core/session';
import type { Role } from './core/types';
import { environment, loadChart, signOut } from './data/medplum';
import type { ChartData } from './data/fhir';
import { offlineChart } from './mock/patient';
import { mockFacts, mockProgram, mockSpec, mockValueSets, mockViews } from './mock/workflow';
import { ScreenRenderer } from './render/ScreenRenderer';
import { Storyboard } from './shell/Storyboard';

const personaSchema = z.enum(['P1', 'P2', 'P3', 'P4', 'P5']);
const personas: { value: z.infer<typeof personaSchema>; label: string; role: Role; name: string }[] = [
  { value: 'P1', label: 'P1 · Primary care physician', role: 'physician', name: 'Jordan Lee, MD' },
  { value: 'P2', label: 'P2 · ED physician', role: 'physician', name: 'Sam Rivera, MD' },
  { value: 'P3', label: 'P3 · Inpatient RN', role: 'rn', name: 'Casey Patel, RN' },
  { value: 'P4', label: 'P4 · Pediatric NP', role: 'np', name: 'Avery Chen, NP' },
  { value: 'P5', label: 'P5 · General surgeon', role: 'surgeon', name: 'Taylor Brooks, MD' },
];
const interp = createMockInterp(mockViews, mockFacts);

export function App() {
  const [personaId, setPersonaId] = useState<z.infer<typeof personaSchema>>('P1');
  const [login, setLogin] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<ChartData>(offlineChart);
  const [loadError, setLoadError] = useState('');
  const persona = personas.find((item) => item.value === personaId) ?? personas[0];
  if (!persona) throw new Error('No development personas configured');
  const session = useMemo(() => createSession(interp, mockSpec, mockProgram, mockFacts, { id: personaId, role: persona.role }), [personaId, persona.role]);
  const { view, message } = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    let active = true;
    // A read-only effect; all FHIR operations stay in the single data module.
    loadChart().then((chart) => { if (active) { setData(chart); setLoadError(''); } }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : 'Chart validation failed'); });
    return () => { active = false; };
  }, [refresh]);

  if (login) return <main className="signin-page"><div className="signin-brand">VGI<span>HEALTH</span></div><Paper withBorder shadow="sm" p="xl" w={420} maw="95vw"><h1>Clinical workspace</h1><p className="subtle">Sign in to your local Medplum instance.</p><SignInForm clientId={environment.VITE_MEDPLUM_CLIENT_ID} onSuccess={() => { setLogin(false); setRefresh((value) => value + 1); }} /><Button variant="subtle" mt="md" fullWidth onClick={() => setLogin(false)}>Continue with offline demonstration</Button><small className="subtle">Server: {environment.VITE_MEDPLUM_BASE_URL}</small></Paper></main>;

  return <div className="ehr-app"><header className="app-header"><a href="#" className="brand" aria-label="VGI Health workspace">VGI<span>HEALTH</span></a><div className="facility">NORTHSIDE FAMILY MEDICINE<span>Ambulatory clinical workspace</span></div><div className="header-right"><Badge size="sm" color="teal" variant="light">{data.source === 'offline' ? 'OFFLINE DEMO' : 'MEDPLUM CONNECTED'}</Badge><span className="clinician-name">{persona.name}</span><Button size="compact-xs" variant="default" onClick={() => {
    if (data.source === 'medplum') { signOut().then(() => setRefresh((value) => value + 1)).catch(() => setLoadError('Sign-out failed')); } else setLogin(true);
  }}>{data.source === 'medplum' ? 'Sign out' : 'Sign in'}</Button></div></header>
    <div className="workspace-toolbar"><div className="workspace-breadcrumb">Schedule <span>/</span> Clinical workspace <span>/</span> <strong>W1 · Outpatient visit</strong></div><div className="persona-control"><label htmlFor="persona">DEV PERSONA</label><NativeSelect id="persona" size="xs" value={personaId} data={personas.map(({ value, label }) => ({ value, label }))} onChange={(event) => setPersonaId(personaSchema.parse(event.currentTarget.value))} /></div></div>
    <div className="preview-notice"><span className="preview-dot" /><strong>Navigation preview</strong><span>Uncertified mock interpreter · clinical actions unavailable</span><span className="data-source">{data.message}</span></div>
    {loadError && <Alert color="red" title="Chart input rejected">{loadError}</Alert>}
    <div className="ehr-layout"><Storyboard data={data} /><main className="clinical-workspace"><div className="encounter-strip"><div><Badge size="xs" color="teal" variant="dot">In progress</Badge><span>Office visit · Follow-up</span></div><span>{data.context.asOf} · Family medicine</span><strong>Encounter preview</strong></div>
      <ScreenRenderer view={view} data={data} spec={mockSpec} valueSets={mockValueSets} onEvent={session.dispatch} />
      <div className="unused-activities" aria-label="Activities outside this preview">Additional activities: Imaging · MAR · History · Care Gaps · Surgical Case</div>
    </main></div><footer className="status-bar"><span role="status" aria-live="polite">{message}</span><span>W1 v0 · {personaId} · No clinical writes</span></footer>
  </div>;
}
