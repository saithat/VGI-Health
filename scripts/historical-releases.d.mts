export const historicalReleaseAliases: Readonly<Record<string, string>>;
export const historicalRunIds: ReadonlySet<string>;
export function historicalReleaseId(id: string): string;
export function releaseLabel(id: string, runId: string): string;
export function archivedReleaseId(id: string): string;
export function complexityReleaseLabels<T extends { personas: { iterations: { specVersion: string }[]; markers: { kind: string; label: string }[] }[]; releaseNaming?: string | undefined }>(data: T): T;
export function trajectoryReleaseLabels<T extends { runId: string; releaseNaming?: string | undefined; tasks: { release: string; baseline?: { release: string } | undefined }[] }>(data: T): T;
export function historicalReleaseEventId(event: string): string;
export function archivedReleaseEventId(event: string): string;
