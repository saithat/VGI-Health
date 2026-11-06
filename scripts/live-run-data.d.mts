export interface Prefix {
  dir: string;
  key: string;
  manifest: {
    runId: string;
    days: number;
    daysCompleted: number;
    nightsCompleted: number;
    personas: string[];
    ehr: { mode: string };
    createdAt?: string;
    [key: string]: unknown;
  };
  files: string[];
  versions: Map<string, Set<number>>;
}
export function completedPrefix(dir: string, files?: string[]): Promise<Prefix>;
export function derived(
  prefix: Prefix,
  kind: string,
  root: string,
  generate?: boolean,
): Promise<unknown>;
export function runSummary(prefix: Prefix, root: string): Promise<unknown>;

export function savedPrefix(current: Prefix, key: string): Promise<Prefix>;

export function readDecision(prefix: Prefix, file: string): Promise<unknown>;
