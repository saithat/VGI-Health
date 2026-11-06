import { withData } from "./data.js";
import { RELEASE_IDS } from '../src/release-config.js';
import { capabilitiesManual, formalRuleContext, promptContext } from '../src/manual.js';
import { sha256 } from '../src/program.js';
import { createEhr } from '../src/ehr.js';
import { loadRelease, releaseForPersona } from '../src/releases.js';

withData("runs/core-10day/decisions").it('generates the core manual and persona rules from active formal sources with reproducible hashes', async () => {
  const release = await releaseForPersona(await loadRelease(RELEASE_IDS.base, createEhr({ fake: false })), 'P3');
  const c = promptContext(release.spec, release.canonical);
  expect(c.manualHash).toBe(sha256(capabilitiesManual()));
  expect(c.ruleContextHash).toBe(sha256(formalRuleContext(release.spec, release.canonical)));
  expect(c.manual).toContain('One canonical');
  expect(c.manual).toContain('Catalog additions are switched off');
  expect(c.manual).toContain('Property 12');
  expect(c.manual).toContain('D5');
  expect(c.manual).toContain('accepted by checker (recorded core-10day');
  expect(c.manual).toContain('rejected (recorded core-10day');
  expect(c.rules).toContain('administerMed');
  expect(c.rules).toContain('Hospital policy');
  expect(c.rules).not.toContain('"commit":"signOrders"');
  expect(c.rules).toContain('human-only');
});

it('keeps the full generated Program interface balanced, including inner patient-selection documentation',async()=>{
 const ts=await import('typescript');const {programVocabulary}=await import('../src/manual.js');
 const text=programVocabulary(),program=text.slice(text.indexOf('export interface Program'));
 expect(program).toContain('patientSelection?');expect(program.trim().endsWith('}')).toBe(true);
 const scanner=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,program);let balance=0;
 for(let token=scanner.scan();token!==ts.SyntaxKind.EndOfFileToken;token=scanner.scan()){if(token===ts.SyntaxKind.OpenBraceToken)balance++;if(token===ts.SyntaxKind.CloseBraceToken)balance--;expect(balance).toBeGreaterThanOrEqual(0);}
 expect(balance).toBe(0);
 const result=ts.transpileModule(text,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 expect(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)).toEqual([]);
});
