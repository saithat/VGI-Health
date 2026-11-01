import { z } from "zod";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const buildBindingSchema = z.object({
  schemaVersion: z.literal(1),
  wasmSha256: digest,
  appSha256: digest,
  componentsSha256: digest,
  programSha256: digest,
  certificateSha256: digest,
  sourceProgramSha256: digest.optional(),
});
export type BuildBinding = z.infer<typeof buildBindingSchema>;
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export async function contentHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
export async function assertBuildBinding(binding: BuildBinding, current: { appSha256: string; wasmSha256: string; componentsSha256: string }, program: unknown, certificate: unknown): Promise<void> {
  for (const key of ["appSha256", "wasmSha256", "componentsSha256"] as const) {
    if (binding[key] !== current[key]) throw new Error(`Certified build mismatch (${key}). Re-certify this fork against the installed app and interpreter before login.`);
  }
  if (binding.programSha256 !== await contentHash(program) || binding.certificateSha256 !== await contentHash(certificate))
    throw new Error("Certified build binding does not match this program/certificate. Login refused.");
}
