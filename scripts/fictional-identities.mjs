import { createHash } from 'node:crypto';

const types = new Set(['Organization', 'Location', 'Practitioner', 'InsurancePlan']);
const seed = 'vgi-fictional-identities-v1';
const catalogMatchers = new WeakMap();
const escapePattern = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const token = value => createHash('sha256').update(`${seed}:${value}`).digest('hex').slice(0, 10);
const fictional = value => /^(?:Dr\. )?Fictional\b/.test(value);
export function fictionalIdentity(kind, key) {
  const code = token(`${kind}:${String(key).trim().toLowerCase()}`);
  return {
    name: `Fictional ${kind === 'Practitioner' ? 'Clinician' : kind === 'Location' ? 'Care Site' : 'Health Services'} ${code}`,
    address: { line: [`${100 + parseInt(code.slice(0, 4), 16) % 800} Fictional Lantern Way`], city: 'Fictional Harbor', state: 'ZZ', postalCode: '00000', country: 'US' },
    phone: `202-555-01${String(parseInt(code.slice(0, 4), 16) % 100).padStart(2, '0')}`,
    identifier: `fictional-${code}`,
    email: `${code}@example.invalid`,
  };
}
const owned = system => /^(?:urn:vgi|https:\/\/vgi-health\.example)/.test(system ?? '');
const list = value => value === undefined ? [] : Array.isArray(value) ? value : [value];
const nameText = name => typeof name === 'string' ? name : name?.text ?? [...(name?.given ?? []), name?.family].filter(Boolean).join(' ');
const roleKind = label => /^(?:(?:last |primary )?(?:provider|prescriber|practitioner|clinician|nurse|attending|rn|pcp|author)|lastProvider|pcpName|last.*by)$/i.test(label) ? 'Practitioner' : /^(?:(?:last )?(?:location|facility|hospital|pharmacy)|locationName|lastLocation)$/i.test(label) ? 'Location' : /^(?:payer|payor|coverage|insurer|organizationName)$/i.test(label) ? 'Organization' : null;
// Clinical categories and role labels are not identity names. In particular,
// facilityKind and preferredPharmacy carry rule inputs, not facility names.
const clinicalCategory = /^(?:community|hospital|clinic|other|general-acute-care|hospital-outpatient|non-hospital|physician|surgeon|rn|np|nurse|clinician|practitioner)$/i;

/** Collect source identities before trimming so references and encoded notes agree.
 * The catalog is ephemeral; no real identity table is written to artifacts.
 */
export function identityCatalog(value, catalog = new Map()) {
  const add = (kind, text) => {
    if (typeof text === 'string' && text.length > 2 && !fictional(text) && !clinicalCategory.test(text) && !/^(?:unknown|not recorded|none|no |—|Dr\. Fictional)/i.test(text))
      catalog.set(text, fictionalIdentity(kind, text).name);
  };
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      if (node.length === 2 && typeof node[0] === 'string' && node[0] !== node[0].toLowerCase() && typeof node[1] === 'string') {
        const kind = roleKind(node[0]); if (kind) add(kind, node[1]);
      }
      node.forEach(visit); return;
    }
    const kind = node.type?.split?.('/').at(-1) ?? node.reference?.match?.(/(?:^|\/)(Organization|Location|Practitioner|InsurancePlan)(?:[/?]|$)/)?.[1];
    if (types.has(kind)) add(kind, node.display);
    if (types.has(node.resourceType) && !fictional(nameText(Array.isArray(node.name) ? node.name[0] : node.name))) {
      for (const name of Array.isArray(node.name) ? node.name : [node.name]) add(node.resourceType, nameText(name));
      const generated = fictionalIdentity(node.resourceType, nameText(Array.isArray(node.name) ? node.name[0] : node.name));
      for (const address of list(node.address)) {
        if (address.text) catalog.set(address.text, `${generated.address.line[0]}, ${generated.address.city}, ZZ 00000`);
        for (const line of address.line ?? []) if (line.length > 3) catalog.set(line, generated.address.line[0]);
      }
      for (const contact of list(node.telecom)) if (typeof contact.value === 'string' && contact.value.length > 3)
        catalog.set(contact.value, contact.system === 'email' ? generated.email : contact.system === 'url' ? 'https://example.invalid' : generated.phone);
      for (const identifier of list(node.identifier)) if (!owned(identifier.system) && typeof identifier.value === 'string' && identifier.value.length > 3)
        catalog.set(identifier.value, generated.identifier);
    }
    for (const [key, child] of Object.entries(node)) {
      if (/^(?:author|attester|performer|recorder)$/.test(key))
        for (const reference of list(child)) add('Practitioner', reference?.display);
      if (/^(?:payor|payer|insurer|managingOrganization)$/.test(key))
        for (const reference of list(child)) add('Organization', reference?.display);
      if (typeof child === 'string' && /^(?:provider|practitioner|payer|insurer|facility|locationName|organizationName|pcpName|lastProvider|lastLocation)$/.test(key)) add(roleKind(key) ?? 'Organization', child);
      visit(child);
    }
  };
  visit(value); return catalog;
}

export function fictionalize(value, catalog = identityCatalog(value)) {
  // The upstream directory contains thousands of identities. Restrict the
  // replacement automaton to identities actually present in this patient,
  // including encoded text, before walking its many small clinical strings.
  const notes = [];
  const collect = node => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.data === 'string' && /^(text\/|application\/xhtml)/.test(node.contentType ?? ''))
      notes.push(Buffer.from(node.data, 'base64').toString('utf8'));
    for (const item of Object.values(node)) if (item && typeof item === 'object') collect(item);
  };
  collect(value);
  const textCorpus = JSON.stringify(value) + '\n' + notes.join('\n');
  let matcher = catalogMatchers.get(catalog);
  if (!matcher || matcher.size !== catalog.size) {
    const sources = [...catalog.keys()].sort((a, b) => b.length - a.length);
    matcher = { size: catalog.size, pattern: sources.length ? new RegExp(sources.map(escapePattern).join('|'), 'g') : null };
    catalogMatchers.set(catalog, matcher);
  }
  const present = new Set(matcher.pattern ? textCorpus.match(matcher.pattern) ?? [] : []);
  const entries = [...present].map(source => [source, catalog.get(source)]).sort(([a], [b]) => b.length - a.length);
  const pattern = entries.length ? new RegExp(entries.map(([a]) => '(?<![A-Za-z0-9])' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9])').join('|'), 'g') : null;
  const text = s => pattern ? s.replace(pattern, match => catalog.get(match)) : s;
  const visit = node => {
    if (typeof node === 'string') return text(node);
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== 'object') return node;
    const out = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, visit(child)]));
    const referenceKind = node.type?.split?.('/').at(-1) ?? node.reference?.match?.(/(?:^|\/)(Organization|Location|Practitioner|InsurancePlan)(?:[/?]|$)/)?.[1];
    if (types.has(referenceKind) && typeof node.display === 'string' && clinicalCategory.test(node.display))
      out.display = fictionalIdentity(referenceKind, node.display).name;
    // Patient identity and patient resource IDs are deliberately preserved.
    if (node.resourceType === 'Patient') {
      for (const key of ['name', 'id', 'address', 'telecom', 'identifier'])
        if (key in node) out[key] = structuredClone(node[key]);
    }
    if (types.has(node.resourceType)) {
      const original = nameText(Array.isArray(node.name) ? node.name[0] : node.name) || node.id || node.resourceType;
      if (!fictional(original)) {
        const generated = fictionalIdentity(node.resourceType, original);
        out.name = node.resourceType === 'Practitioner' ? [{ text: generated.name, family: generated.name.split(' ').at(-1), given: ['Fictional', 'Clinician'] }] : generated.name;
        if (node.address) out.address = Array.isArray(node.address) ? [generated.address] : generated.address;
        if (node.telecom) out.telecom = node.telecom.map(c => ({ system: c.system, value: c.system === 'email' ? generated.email : c.system === 'url' ? 'https://example.invalid' : generated.phone }));
        if (node.identifier) out.identifier = [...node.identifier.filter(i => owned(i.system)), ... (node.identifier.some(i => !owned(i.system)) ? [{ system: 'https://vgi-health.example/fictional-identity', value: generated.identifier }] : [])];
      }
    }
    if (typeof node.data === 'string' && /^(text\/|application\/xhtml)/.test(node.contentType ?? ''))
      out.data = Buffer.from(text(Buffer.from(node.data, 'base64').toString('utf8'))).toString('base64');
    return out;
  };
  return visit(value);
}
