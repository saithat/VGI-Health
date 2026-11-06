export const root: string;
export function completedCatalogRuns(
  directory: string,
): Promise<Map<string, import("../../scripts/live-run-data.mjs").Prefix>>;
export function buildCatalog(): Promise<unknown>;
export function jsonFiles(directory: string): Promise<string[]>;
export function readJson(path: string): Promise<unknown>;
