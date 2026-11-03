import { readBinding } from './binding-pointer.js';
import { presentationBundleSchema } from '../../app/src/ehr/ui/presentation-types.js';
import { existsSync } from 'node:fs';
import { expandProgram } from './composites.js';
import { compilePresentations } from './presentation-compiler.js';
import { REPO_ROOT } from './util.js';
/**
 * Run directory layout:
 *   runs/<run-id>/manifest.json
 *   runs/<run-id>/programs/<P>/v<N>.json      deployed program versions
 *   runs/<run-id>/programs/<P>/deployed.json  { version, program, certificate } (what login loads)
 *   runs/<run-id>/certs/<P>/v<N>.json         certificates
 *   runs/<run-id>/decisions/night-<NN>/<P>.json
 *   runs/<run-id>/days/day-<NN>/<P>.json       DayResult (the shift simulated at login)
 *   runs/<run-id>/llm/<callId>.json            every LLM call (prompt + response)
 *   runs/<run-id>/break/<P>-<hash>.json        try-to-break-it results
 *   runs/<run-id>/summary.json
 */
import path from 'node:path';
import { buildBindingSchema, type BuildBinding } from './build-binding.js';
import { sha256, stableStringify } from './program.js';
import { z } from 'zod';
import {
  certificateSchema, dayResultSchema, decisionRecordSchema, programSchema,
  type Certificate, type DayResult, type DecisionRecord, type Program,
} from './schema.js';
import { pad2, readJson, writeJson, writeJsonAtomic } from './util.js';

export const deployedPointerSchema = z.object({ version: z.number().int().nonnegative(), program: z.string(), certificate: z.string(), build: z.string().optional(), source: z.string().optional(), components: z.string().optional() });

export class RunStore {
  constructor(readonly dir: string, private readonly customRoot = path.join(REPO_ROOT, 'app/src/ehr/ui/custom')) {}

  programPath(persona: string, version: number): string { return path.join(this.dir, 'programs', persona, `v${version}.json`); }
  certPath(persona: string, version: number): string { return path.join(this.dir, 'certs', persona, `v${version}.json`); }
  decisionPath(night: number, persona: string): string { return path.join(this.dir, 'decisions', `night-${pad2(night)}`, `${persona}.json`); }
  dayPath(day: number, persona: string): string { return path.join(this.dir, 'days', `day-${pad2(day)}`, `${persona}.json`); }
  rel(p: string): string { return path.relative(this.dir, p); }

  /** Store a certified version and point login at it. */
  async deploy(persona: string, program: Program, certificate: Certificate, build?: BuildBinding, night?: number): Promise<{ version: number; program: string; certificate: string; build?: string; source?: string; components?: string }> {
    const currentPointerFile = path.join(this.dir, 'programs', persona, 'deployed.json');
    if (existsSync(currentPointerFile)) {
      const current = await readJson(currentPointerFile, deployedPointerSchema);
      if(program.version===current.version){
        const source=await readJson(path.join(this.dir,current.source??current.program),programSchema);
        const certified=await readJson(path.join(this.dir,current.certificate),certificateSchema);
        const sameBuild=!build||(current.build&&stableStringify(await readBinding(path.join(this.dir,current.build)))===stableStringify(build));
        if(stableStringify(source)===stableStringify(program)&&stableStringify(certified)===stableStringify(certificate)&&sameBuild)return {version:current.version,program:current.program,certificate:current.certificate,...(current.build?{build:current.build}:{}),...(current.source?{source:current.source}:{}),...(current.components?{components:current.components}:{})};
      }
      if (program.version <= current.version) throw new Error('Published versions are immutable; deploy a new version');
    }
    const programFile = this.programPath(persona, program.version);
    const certFile = this.certPath(persona, program.version);
    const executable = expandProgram(program);
    const components = compilePresentations(program);
    if (build) {
      buildBindingSchema.parse(build);
      if (build.programSha256 !== sha256(stableStringify(executable)) || build.componentsSha256 !== sha256(stableStringify(components ?? []))) throw new Error('Staged build does not bind the executable/component bundle');
    }
    const sourceFile = programFile.replace(/\.json$/, '.source.json');
    const componentsFile = programFile.replace(/\.json$/, '.components.json');
    await writeJsonAtomic(sourceFile, program);
    if (components) {
      if (!/^[\w-]+$/.test(program.owner)) throw new Error('Unsafe presentation owner path');
      await writeJsonAtomic(componentsFile, components);
      const customDir = path.join(this.customRoot, program.owner, `v${program.version}`);
      for (const component of components.components) {
        const { writeFile, mkdir } = await import('node:fs/promises');
        await mkdir(customDir, { recursive: true });
        await writeFile(path.join(customDir, `${component.name}.tsx`), component.source);
      }
      await writeJsonAtomic(path.join(customDir, 'manifest.json'), components);
    }
    await writeJsonAtomic(programFile, executable);
    await writeJsonAtomic(certFile, certificate);
    const buildFile = certFile.replace(/\.json$/, '.build.json');
    if (build) await writeJsonAtomic(buildFile, buildBindingSchema.parse(build));
    const pointer = { version: program.version, program: this.rel(programFile), certificate: this.rel(certFile), source: this.rel(sourceFile), ...(components ? { components: this.rel(componentsFile) } : {}), ...(build ? { build: this.rel(buildFile) } : {}) };
    if (night === undefined) await writeJsonAtomic(path.join(this.dir, 'programs', persona, 'deployed.json'), pointer);
    else await writeJsonAtomic(path.join(this.dir, 'pending', `${persona}.json`), { night, persona, pointer });
    return pointer;
  }

  /** Login: load the deployed program and its certificate. */
  async login(persona: string): Promise<{ program: Program; certificate: Certificate }> {
    await this.recover(persona);
    const pointer = await readJson(path.join(this.dir, 'programs', persona, 'deployed.json'), deployedPointerSchema);
    const program = await readJson(path.join(this.dir, pointer.program), programSchema);
    const certificate = await readJson(path.join(this.dir, pointer.certificate), certificateSchema);
    if (pointer.build) {
      const binding = await readBinding(path.join(this.dir, pointer.build));
      if (binding.programSha256 !== sha256(stableStringify(program)) || binding.certificateSha256 !== sha256(stableStringify(certificate)))
        throw new Error('Deployed program/certificate no longer match their build binding');
    }
    const source = pointer.source ? await readJson(path.join(this.dir, pointer.source), programSchema) : program;
    if (pointer.build) {
      const binding = await readBinding(path.join(this.dir, pointer.build));
      if (binding.sourceProgramSha256 && binding.sourceProgramSha256 !== sha256(stableStringify(source))) throw new Error('Source program no longer matches its build binding');
      const components = pointer.components ? await readJson(path.join(this.dir, pointer.components), presentationBundleSchema) : [];
      if (binding.componentsSha256 !== sha256(stableStringify(components))) throw new Error('Components no longer match the build binding');
    }
    return { program: source, certificate };
  }

  async writeDecision(record: DecisionRecord): Promise<string> {
    const file = this.decisionPath(record.night, record.persona);
    await writeJsonAtomic(file, decisionRecordSchema.parse(record));
    await this.recover(record.persona);
    return file;
  }

  /** A durable decision precedes the only publication point. Safe after a process crash. */
  async recover(persona: string, cleanup=false): Promise<void> {
    const pending = path.join(this.dir, 'pending', `${persona}.json`);
    if (!existsSync(pending)) {if(cleanup)await this.cleanStaging(persona);return;}
    const tx = z.object({night:z.number(),pointer:deployedPointerSchema}).parse(JSON.parse(await (await import('node:fs/promises')).readFile(pending, 'utf8')));
    const file = this.decisionPath(tx.night, persona);
    if (!existsSync(file)) {if(cleanup){await this.cleanStaging(persona);await (await import('node:fs/promises')).rm(pending,{force:true});}return;}
    const record = await readJson(file, decisionRecordSchema);
    if (!record.deployed || record.versionAfter !== tx.pointer.version) {if(cleanup){await this.cleanStaging(persona);await (await import('node:fs/promises')).rm(pending,{force:true});}return;}
    const current = path.join(this.dir, 'programs', persona, 'deployed.json');
    const old = existsSync(current) ? await readJson(current, deployedPointerSchema) : null;
    if (!old || old.version < tx.pointer.version) await writeJsonAtomic(current, tx.pointer);
    await (await import('node:fs/promises')).rm(pending);
    if(cleanup)await this.cleanStaging(persona);
  }

  private async cleanStaging(persona:string):Promise<void>{
    const fs=await import('node:fs/promises');
    const directory=path.join(this.dir,'programs',persona), pointerFile=path.join(directory,'deployed.json');
    const current=existsSync(pointerFile)?(await readJson(pointerFile,deployedPointerSchema)).version:-1;
    if(!existsSync(directory))return;
    const versions=new Set((await fs.readdir(directory)).flatMap(file=>{const m=/^v(\d+)\./.exec(file);return m?[Number(m[1])]:[];}));
    for(const version of versions){
      if(version<=current)continue;
      const source=path.join(directory,`v${version}.source.json`), executable=path.join(directory,`v${version}.json`);
      const owner=existsSync(source)||existsSync(executable)?(await readJson(existsSync(source)?source:executable,programSchema)).owner:null;
      for(const name of await fs.readdir(directory))if(name===`v${version}.json`||name.startsWith(`v${version}.`))await fs.rm(path.join(directory,name),{force:true});
      const certs=path.join(this.dir,'certs',persona);
      if(existsSync(certs))for(const name of await fs.readdir(certs))if(name===`v${version}.json`||name.startsWith(`v${version}.`))await fs.rm(path.join(certs,name),{force:true});
      for(const kind of ['native','certifications'])await fs.rm(path.join(this.dir,kind,persona,`v${version}`),{recursive:true,force:true});
      if(owner&&/^[\w-]+$/.test(owner))await fs.rm(path.join(this.customRoot,owner,`v${version}`),{recursive:true,force:true});
      await writeJson(path.join(this.dir,'recovery',`${persona}-v${version}.json`),{persona,version,reason:'Discarded unpublished staging during resume',timestamp:new Date().toISOString()});
    }
  }

  readDecision(night: number, persona: string): Promise<DecisionRecord> {
    return readJson(this.decisionPath(night, persona), decisionRecordSchema);
  }

  async writeDay(result: DayResult): Promise<void> {
    await writeJson(this.dayPath(result.day, result.persona), dayResultSchema.parse(result));
  }

  readProgram(persona: string, version: number): Promise<Program> {
    const executable = this.programPath(persona, version);
    const source = executable.replace(/\.json$/, '.source.json');
    return readJson(existsSync(source) ? source : executable, programSchema);
  }
}
