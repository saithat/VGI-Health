export interface Ehr {
  /** A synchronous call after loadEhr has resolved. */
  step(input: string): string;
}

export interface LoadOptions {
  locateFile?: (filename: string, scriptDirectory: string) => string;
  wasmBinary?: Uint8Array;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}

export function loadEhr(options?: LoadOptions): Promise<Ehr>;
