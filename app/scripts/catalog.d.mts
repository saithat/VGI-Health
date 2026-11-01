export const root: string;
export function buildCatalog(): Promise<unknown>;
export function jsonFiles(directory: string): Promise<string[]>;
export function readJson(path: string): Promise<unknown>;
