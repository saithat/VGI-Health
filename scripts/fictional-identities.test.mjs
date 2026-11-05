import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fictionalize, fictionalIdentity } from './fictional-identities.mjs';
test('seeded fictional identities replace linked names, contacts, NPIs and encoded notes while preserving patients', () => {
  const real = 'Public Facility Example';
  const original = { resourceType: 'Bundle', entry: [
    { resource: { resourceType: 'Organization', id: 'org-1', name: real, address: [{line:['12 Source Street']}], telecom:[{system:'phone',value:'617-123-4567'}], identifier:[{system:'http://hl7.org/fhir/sid/us-npi',value:'1234567890'}] } },
    { resource: { resourceType:'Patient',id:'patient-1',name:[{text:'Alex Synthetic'}],managingOrganization:{reference:'Organization/org-1',display:real} } },
    { resource: { resourceType:'DocumentReference',content:[{attachment:{contentType:'text/plain',data:Buffer.from(`Seen at ${real}`).toString('base64')}}] } },
  ] };
  const result = fictionalize(original);
  assert.deepEqual(result, fictionalize(original)); assert.deepEqual(result, fictionalize(result));
  assert.equal(result.entry[0].resource.name, fictionalIdentity('Organization',real).name);
  assert.equal(result.entry[1].resource.managingOrganization.display,result.entry[0].resource.name);
  assert.deepEqual(result.entry[1].resource.name, original.entry[1].resource.name);
  assert.equal(result.entry[1].resource.id,'patient-1');
  assert.doesNotMatch(JSON.stringify(result), /Public Facility Example|12 Source Street|617-123-4567|1234567890/);
  assert.match(Buffer.from(result.entry[2].resource.content[0].attachment.data,'base64').toString(), /Fictional Health Services/);
});
test('all generated fixture and world identity resources use fictional names', async () => {
  const {readdir,readFile}=await import('node:fs/promises');
  for(const directory of ['fixtures/synthea','fixtures/synthetic-hospital','runs/world/2/context','app/src/fixtures/presentations','app/src/fixtures/ui','app/src/fixtures/punch']) {
    const names=await readdir(new URL('../'+directory+'/',import.meta.url)).catch(()=>[]);
    for(const file of names.filter(f=>f.endsWith('.json')&&f!=='index.json')) {
      const value=JSON.parse(await readFile(new URL('../'+directory+'/'+file,import.meta.url),'utf8'));
      const visit=node=>{
        if(!node||typeof node!=='object')return;
        if(Array.isArray(node)&&node.length===2&&/^(?:Provider|RN|Location|Coverage)$/.test(node[0])&&typeof node[1]==='string'&&node[1].trim()&&!/^(?:—|Unknown|Not recorded)$/.test(node[1]))
          assert.match(node[1],/^Fictional (?:Clinician|Care Site|Health Services) [a-f0-9]{10}$/,`${directory}/${file}: identity field`);
        if(['Organization','Location','Practitioner','InsurancePlan'].includes(node.resourceType)) {
          const name=Array.isArray(node.name)?node.name[0]?.text:node.name;
          assert.match(name??'',/^Fictional (?:Clinician|Care Site|Health Services) [a-f0-9]{10}$/,`${directory}/${file}`);
        }
        if(['Organization','Location','Practitioner','InsurancePlan'].includes(node.type)&&node.display)
          assert.match(node.display,/^Fictional (?:Clinician|Care Site|Health Services) [a-f0-9]{10}$/,`${directory}/${file}: identity display`);
        for(const child of Object.values(node))visit(child);
      };visit(value);
      assert.doesNotMatch(JSON.stringify(value), /Mass\s+General\s+Brigham|Tracy\s+Wilderman/i);
    }
  }
});
test('display-only payer references also come from the fictional generator',()=>{
 const input={resourceType:'Coverage',payor:[{display:'Example Source Plan'}]};
 assert.equal(fictionalize(input).payor[0].display,fictionalIdentity('Organization','Example Source Plan').name);
});
test('clinical setting codes and role labels survive identity substitution',()=>{
 const input={record:[['facilityKind','general-acute-care'],['preferredPharmacy','community'],['Pharmacy','hospital']],columns:['provider','location'],provider:'physician',resource:{resourceType:'Organization',id:'o',name:'Hospital'},reference:{reference:'Organization/o',display:'Hospital'}};
 const output=fictionalize(input);
 assert.deepEqual(output.record,input.record);
 assert.deepEqual(output.columns,input.columns);
 assert.equal(output.provider,'physician');
 assert.equal(output.resource.name,fictionalIdentity('Organization','Hospital').name);
 assert.equal(output.reference.display,output.resource.name);
});
