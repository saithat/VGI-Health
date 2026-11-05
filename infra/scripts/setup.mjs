#!/usr/bin/env node
import { fictionalIdentity } from '../../scripts/fictional-identities.mjs';
// Idempotent first-boot setup for the local Medplum stack.
//
//   node infra/scripts/setup.mjs        (or: make setup)
//
// Logs in as the default super admin (admin@example.com / medplum_admin), then ensures:
//   - a Project "VGI Health" (the super admin becomes its owner/admin) with the
//     'transaction-bundles' feature (atomic transactions, used by load.mjs);
//   - a ClientApplication "VGI Health App" (client credentials for scripts, PKCE login for the app);
//   - Practitioner resources for the personas P1-P5 plus a second inpatient RN (RN2), keyed by
//     identifier https://vgi-health.example/fhir/sid/persona|<code>;
//   - a login-capable User + ProjectMembership for each persona (p1@vgi-health.example, ...);
//   - .env at the repo root with base URL, project id, client credentials, persona references.
//
// Running it again changes nothing: every step looks up the existing resource first and only
// creates or updates when something is missing or different. Other keys in .env are preserved.
//
// Env overrides: MEDPLUM_BASE_URL, MEDPLUM_ADMIN_EMAIL, MEDPLUM_ADMIN_PASSWORD,
//                VGI_USER_PASSWORD, VGI_APP_REDIRECT_URIS (comma separated), VGI_CREATE_USERS=0.
import { ClientStorage, createReference, getReferenceString, MedplumClient, MemoryStorage } from '@medplum/core';
import { createHash, randomBytes } from 'node:crypto';
import { containsFields, ENV_PATH, log, PERSONA_SYSTEM, readEnvFile, updateEnvFile, withSlash } from './lib.mjs';

const PROJECT_NAME = 'VGI Health';
const CLIENT_NAME = 'VGI Health App';
const EMAIL_DOMAIN = 'vgi-health.example';

const existingEnv = readEnvFile().values;
const baseUrl = withSlash(process.env.MEDPLUM_BASE_URL ?? existingEnv.MEDPLUM_BASE_URL ?? 'http://localhost:8103/');
const appUrl = withSlash(process.env.MEDPLUM_APP_URL ?? existingEnv.MEDPLUM_APP_URL ?? 'http://localhost:3000/');
const adminEmail = process.env.MEDPLUM_ADMIN_EMAIL ?? 'admin@example.com';
const adminPassword = process.env.MEDPLUM_ADMIN_PASSWORD ?? 'medplum_admin';
const createUsers = (process.env.VGI_CREATE_USERS ?? '1') !== '0';
const redirectUris = (process.env.VGI_APP_REDIRECT_URIS ?? 'http://localhost:5173/,http://localhost:4173/')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const V2_0360 = 'http://terminology.hl7.org/CodeSystem/v2-0360';
const NUCC = 'http://nucc.org/provider-taxonomy';

/** The five personas from BRIEF section 6, plus a second RN for high-alert double checks. */
const PERSONAS = [
  {
    code: 'P1',
    role: 'Primary care physician',
    prefix: ['Dr.'],
    given: ['Maya'],
    family: 'Chen',
    suffix: ['MD'],
    gender: 'female',
    degree: ['MD', 'Doctor of Medicine'],
    taxonomy: ['207R00000X', 'Internal Medicine Physician'],
    setting: 'Adult clinic',
  },
  {
    code: 'P2',
    role: 'Emergency department physician',
    prefix: ['Dr.'],
    given: ['Marcus'],
    family: 'Okafor',
    suffix: ['MD'],
    gender: 'male',
    degree: ['MD', 'Doctor of Medicine'],
    taxonomy: ['207P00000X', 'Emergency Medicine Physician'],
    setting: 'Emergency department',
  },
  {
    code: 'P3',
    role: 'Inpatient registered nurse',
    given: ['Rosa'],
    family: 'Delgado',
    suffix: ['RN'],
    gender: 'female',
    degree: ['RN', 'Registered Nurse'],
    taxonomy: ['163W00000X', 'Registered Nurse'],
    setting: 'Medical ward, 12 h shift',
  },
  {
    code: 'RN2',
    role: 'Inpatient registered nurse (second nurse for high-alert double checks)',
    given: ['Ethan'],
    family: 'Park',
    suffix: ['RN'],
    gender: 'male',
    degree: ['RN', 'Registered Nurse'],
    taxonomy: ['163W00000X', 'Registered Nurse'],
    setting: 'Medical ward, 12 h shift',
  },
  {
    code: 'P4',
    role: 'Pediatric nurse practitioner',
    given: ['Priya'],
    family: 'Raman',
    suffix: ['MSN', 'CPNP'],
    gender: 'female',
    degree: ['NP', 'Nurse Practitioner'],
    taxonomy: ['363LP0200X', 'Nurse Practitioner, Pediatrics'],
    setting: 'Pediatric clinic',
  },
  {
    code: 'P5',
    role: 'General surgeon',
    prefix: ['Dr.'],
    given: ['James'],
    family: 'Whitaker',
    suffix: ['MD', 'FACS'],
    gender: 'male',
    degree: ['MD', 'Doctor of Medicine'],
    taxonomy: ['208600000X', 'Surgery Physician'],
    setting: 'Clinic, OR, ward rounds',
  },
];

function personaEmail(p) {
  return `${p.code.toLowerCase()}@${EMAIL_DOMAIN}`;
}

function buildPractitioner(p) {
  const nameText = fictionalIdentity('Practitioner', p.code).name;
  return {
    resourceType: 'Practitioner',
    identifier: [{ system: PERSONA_SYSTEM, value: p.code }],
    active: true,
    name: [
      {
        use: 'official',
        text: nameText,
        family: nameText.split(' ').at(-1),
        given: ['Fictional', 'Clinician'],
        ...(p.prefix ? { prefix: p.prefix } : {}),
        suffix: p.suffix,
      },
    ],
    telecom: [{ system: 'email', use: 'work', value: personaEmail(p) }],
    gender: p.gender,
    qualification: [
      { code: { coding: [{ system: V2_0360, code: p.degree[0], display: p.degree[1] }], text: p.degree[0] } },
      { code: { coding: [{ system: NUCC, code: p.taxonomy[0], display: p.taxonomy[1] }], text: `${p.role} (${p.setting})` } },
    ],
  };
}

const stats = { created: 0, updated: 0, unchanged: 0 };
function note(kind, what) {
  stats[kind]++;
  log(`  ${kind.padEnd(9)} ${what}`);
}

/**
 * A MedplumClient for Node. @medplum/core computes the PKCE S256 challenge with browser-only APIs
 * (window.btoa) and falls back to 'plain' with a noisy warning in Node, so we compute it ourselves
 * and keep the verifier in the client's storage, where processCode() picks it up.
 */
function newClient() {
  const storage = new ClientStorage(new MemoryStorage());
  const medplum = new MedplumClient({ baseUrl, storage });
  const pkce = () => {
    const verifier = randomBytes(48).toString('base64url');
    storage.setString('codeVerifier', verifier);
    return { codeChallengeMethod: 'S256', codeChallenge: createHash('sha256').update(verifier).digest('base64url') };
  };
  return { medplum, pkce };
}

/** Completes an email/password login, choosing the membership whose project matches `pickProject`. */
async function login({ medplum, pkce }, { projectId, pickProject } = {}) {
  const res = await medplum.startLogin({ email: adminEmail, password: adminPassword, projectId, ...pkce() });
  let code = res.code;
  if (!code && res.memberships) {
    const m = res.memberships.find((x) => pickProject(x));
    if (!m) throw new Error(`No matching membership among: ${res.memberships.map((x) => x.project?.display).join(', ')}`);
    code = (await medplum.post('auth/profile', { login: res.login, profile: m.id })).code;
  }
  if (!code) throw new Error(`Login did not return a code: ${JSON.stringify(res)}`);
  await medplum.processCode(code);
  return res;
}

async function main() {
  log(`Medplum setup against ${baseUrl}`);

  // 1. Super admin session (used to find the project and, if needed, reset persona passwords).
  const adminClient = newClient();
  const admin = adminClient.medplum;
  await login(adminClient, { pickProject: (m) => m.project?.display === 'Super Admin' });
  if (!admin.isSuperAdmin()) throw new Error(`${adminEmail} is not a super admin`);

  // 2. Project.
  const projectClient = newClient();
  const medplum = projectClient.medplum;
  const projects = await admin.searchResources('Project', { 'name:exact': PROJECT_NAME, _count: '10' });
  if (projects.length > 1) throw new Error(`Found ${projects.length} projects named "${PROJECT_NAME}"; delete the extras`);
  if (projects.length === 0) {
    const res = await medplum.startLogin({ email: adminEmail, password: adminPassword, projectId: 'new', ...projectClient.pkce() });
    const created = await medplum.startNewProject({ login: res.login, projectName: PROJECT_NAME });
    await medplum.processCode(created.code);
    note('created', `Project "${PROJECT_NAME}"`);
  } else {
    await login(projectClient, { projectId: projects[0].id, pickProject: (m) => m.project?.reference === `Project/${projects[0].id}` });
    note('unchanged', `Project "${PROJECT_NAME}"`);
  }
  const projectId = medplum.getProject().id;
  log(`  project   ${projectId}`);

  // Atomic FHIR transactions (a super-admin-only project setting), so that load.mjs commits each
  // fixture file together with its load marker, or not at all.
  const projectResource = await admin.readResource('Project', projectId);
  const features = projectResource.features ?? [];
  if (!features.includes('transaction-bundles')) {
    await admin.updateResource({ ...projectResource, features: [...features, 'transaction-bundles'] });
    note('updated', 'Project feature transaction-bundles');
  } else {
    note('unchanged', 'Project feature transaction-bundles');
  }

  // 3. ClientApplication (its ProjectMembership has no access policy -> full access within the project).
  const clientFields = {
    name: CLIENT_NAME,
    description: 'VGI Health EHR app and offline pipeline (setup, load, deploy). Created by infra/scripts/setup.mjs.',
    redirectUris,
  };
  let client = await medplum.searchOne('ClientApplication', { 'name:exact': CLIENT_NAME });
  if (!client) {
    client = await medplum.post(`admin/projects/${projectId}/client`, clientFields);
    note('created', `ClientApplication "${CLIENT_NAME}" (${client.id})`);
  } else if (!containsFields(client, clientFields)) {
    client = await medplum.updateResource({ ...client, ...clientFields });
    note('updated', `ClientApplication "${CLIENT_NAME}" (${client.id})`);
  } else {
    note('unchanged', `ClientApplication "${CLIENT_NAME}" (${client.id})`);
  }
  if (!client.secret) throw new Error('ClientApplication has no secret (are you a project admin?)');

  // 4. Persona Practitioners.
  const practitioners = {};
  for (const p of PERSONAS) {
    const desired = buildPractitioner(p);
    const found = await medplum.searchResources('Practitioner', { identifier: `${PERSONA_SYSTEM}|${p.code}` });
    if (found.length > 1) throw new Error(`Multiple Practitioners for persona ${p.code}`);
    let prac = found[0];
    if (!prac) {
      prac = await medplum.createResource(desired);
      note('created', `Practitioner ${p.code} ${desired.name[0].text} (${prac.id})`);
    } else if (!containsFields(prac, desired)) {
      prac = await medplum.updateResource({ ...prac, ...desired });
      note('updated', `Practitioner ${p.code} ${desired.name[0].text} (${prac.id})`);
    } else {
      note('unchanged', `Practitioner ${p.code} ${desired.name[0].text} (${prac.id})`);
    }
    practitioners[p.code] = prac;
  }

  // 5. Login-capable users (User + ProjectMembership whose profile is the persona Practitioner).
  let userPassword = process.env.VGI_USER_PASSWORD ?? existingEnv.VGI_USER_PASSWORD;
  const passwordIsNew = !userPassword;
  if (passwordIsNew) userPassword = randomBytes(12).toString('base64url');
  if (createUsers) {
    for (const p of PERSONAS) {
      const prac = practitioners[p.code];
      const email = personaEmail(p);
      const membership = await medplum.searchOne('ProjectMembership', { profile: getReferenceString(prac) });
      if (!membership) {
        await medplum.invite(projectId, {
          resourceType: 'Practitioner',
          firstName: p.given.join(' '),
          lastName: p.family,
          email,
          password: userPassword,
          sendEmail: false,
          membership: { profile: createReference(prac), admin: false },
        });
        note('created', `User ${email} -> ${getReferenceString(prac)}`);
      } else if (passwordIsNew) {
        // .env was lost but the user exists: reset the password so .env and the server agree.
        await admin.post('admin/super/setpassword', { email, password: userPassword });
        note('updated', `User ${email} (password reset to match new .env)`);
      } else {
        note('unchanged', `User ${email}`);
      }
    }
  }

  // 6. .env (only managed keys are touched; written only if something changed).
  const updates = {
    MEDPLUM_BASE_URL: baseUrl,
    MEDPLUM_APP_URL: appUrl,
    MEDPLUM_PROJECT_ID: projectId,
    MEDPLUM_CLIENT_ID: client.id,
    MEDPLUM_CLIENT_SECRET: client.secret,
    VITE_MEDPLUM_BASE_URL: baseUrl,
    VITE_MEDPLUM_PROJECT_ID: projectId,
    VITE_MEDPLUM_CLIENT_ID: client.id,
    ...(createUsers ? { VGI_USER_PASSWORD: userPassword } : {}),
    ...Object.fromEntries(PERSONAS.map((p) => [`VGI_PRACTITIONER_${p.code}`, getReferenceString(practitioners[p.code])])),
  };
  const wrote = updateEnvFile(updates, { header: '# --- Medplum (written by infra/scripts/setup.mjs; safe to re-run) ---' });
  log(`  ${wrote ? 'wrote    ' : 'unchanged'} ${ENV_PATH}`);
  log(`Done: ${stats.created} created, ${stats.updated} updated, ${stats.unchanged} unchanged.`);
}

main().catch((err) => {
  console.error('setup failed:', err?.outcome ? JSON.stringify(err.outcome) : err);
  process.exit(1);
});
