import type { Prefix } from "./live-run-data.mjs";
export function readJson(file: string): Promise<unknown>;
export function runFiles(dir: string, prefix?: string): Promise<string[]>;
export function completedPrefix(dir: string, all?: string[]): Promise<Prefix>;
