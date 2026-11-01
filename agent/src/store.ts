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

export const deployedPointerSchema = z.object({ version: z.number().int().nonnegative(), program: z.string(), certificate: z.string(), build: z.string().optional() });

export class RunStore {
  constructor(readonly dir: string) {}

  programPath(persona: string, version: number): string { return path.join(this.dir, 'programs', persona, `v${version}.json`); }
  certPath(persona: string, version: number): string { return path.join(this.dir, 'certs', persona, `v${version}.json`); }
  decisionPath(night: number, persona: string): string { return path.join(this.dir, 'decisions', `night-${pad2(night)}`, `${persona}.json`); }
  dayPath(day: number, persona: string): string { return path.join(this.dir, 'days', `day-${pad2(day)}`, `${persona}.json`); }
  rel(p: string): string { return path.relative(this.dir, p); }

  /** Store a certified version and point login at it. */
  async deploy(persona: string, program: Program, certificate: Certificate, build?: BuildBinding): Promise<{ version: number; program: string; certificate: string; build?: string }> {
    const programFile = this.programPath(persona, program.version);
    const certFile = this.certPath(persona, program.version);
    await writeJsonAtomic(programFile, program);
    await writeJsonAtomic(certFile, certificate);
    const buildFile = certFile.replace(/\.json$/, '.build.json');
    if (build) await writeJsonAtomic(buildFile, buildBindingSchema.parse(build));
    const pointer = { version: program.version, program: this.rel(programFile), certificate: this.rel(certFile), ...(build ? { build: this.rel(buildFile) } : {}) };
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
    return { program, certificate };
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
    return readJson(this.programPath(persona, version), programSchema);
  }
}
