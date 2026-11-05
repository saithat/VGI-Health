#!/usr/bin/env node
// Export the full-profile mapper fixture through Lean without changing the
// production profile or any definition in Specs.
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),dir=await mkdtemp(join(tmpdir(),'neutral-full-fixture-'));
try {
 const source=join(dir,'ExportFull.lean');
 await writeFile(source,`import Ehr.Core.Json
import Ehr.Specs.CriticalResults
open Ehr Ehr.Specs

def main : IO Unit := do
  let v1 := V1.specForProfile .full
  let v2 : Spec := { v1 with
    version := "v2"
    elements := v1.elements ++ [V2.priorAuthRequest, V2.orderKind, V2.orderCode]
    infos := v1.infos ++ [V2.priorAuthStatus]
    design := { v1.design with catalog := v1.design.catalog ++ ["priorAuth"] } }
  let v3 : Spec := { v2 with
    version := "v3"
    elements := v2.elements ++ [V3.abxIndication]
    infos := v2.infos ++ [V3.abxIndicationInfo]
    entries := v2.entries ++ V3.antibioticEntries
    reviews := v2.reviews ++ V3.antibioticReviews }
  IO.FS.writeFile ${JSON.stringify(join(root,'app/tests/fixtures/spec-v3-full.json'))}
    ((Lean.toJson (CriticalResults.followThrough v3)).pretty ++ "\\n")
`);
 execFileSync('lake',['env','lean','--run',source],{cwd:join(root,'lean'),stdio:'inherit',env:{...process.env,LEAN_NUM_THREADS:'4'}});
} finally {await rm(dir,{recursive:true,force:true});}
