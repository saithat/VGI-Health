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
  async deploy(persona: string, program: Program, certificate: Certificate, build?: BuildBinding): Promise<{ version: number; program: string; certificate: string; build?: string; source?: string; components?: string }> {
    const currentPointerFile = path.join(this.dir, 'programs', persona, 'deployed.json');
    if (existsSync(currentPointerFile)) {
      const current = await readJson(currentPointerFile, deployedPointerSchema);
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
    await writeJsonAtomic(path.join(this.dir, 'programs', persona, 'deployed.json'), pointer);
    return pointer;
  }

  /** Login: load the deployed program and its certificate. */
  async login(persona: string): Promise<{ program: Program; certificate: Certificate }> {
    const pointer = await readJson(path.join(this.dir, 'programs', persona, 'deployed.json'), deployedPointerSchema);
    const program = await readJson(path.join(this.dir, pointer.program), programSchema);
    const certificate = await readJson(path.join(this.dir, pointer.certificate), certificateSchema);
    if (pointer.build) {
      const binding = await readJson(path.join(this.dir, pointer.build), buildBindingSchema);
      if (binding.programSha256 !== sha256(stableStringify(program)) || binding.certificateSha256 !== sha256(stableStringify(certificate)))
        throw new Error('Deployed program/certificate no longer match their build binding');
    }
    const source = pointer.source ? await readJson(path.join(this.dir, pointer.source), programSchema) : program;
    if (pointer.build) {
      const binding = await readJson(path.join(this.dir, pointer.build), buildBindingSchema);
      if (binding.sourceProgramSha256 && binding.sourceProgramSha256 !== sha256(stableStringify(source))) throw new Error('Source program no longer matches its build binding');
      const components = pointer.components ? await readJson(path.join(this.dir, pointer.components), presentationBundleSchema) : [];
      if (binding.componentsSha256 !== sha256(stableStringify(components))) throw new Error('Components no longer match the build binding');
    }
    return { program: source, certificate };
  }

  async writeDecision(record: DecisionRecord): Promise<string> {
    const file = this.decisionPath(record.night, record.persona);
    await writeJson(file, decisionRecordSchema.parse(record));
    return file;
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
