export interface EhrInterp {
  readonly exports: string[];
  call(name: string, input: string): string;
  init(input: string): string;
  step(input: string): string;
  view(input: string): string;
  facts(input: string): string;
  render(input: string): string;
}
export interface LoadOptions {
  locateFile?: (filename: string, scriptDirectory: string) => string;
  wasmBinary?: Uint8Array;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}
export const leanExports: string[];
export function loadEhrInterp(options?: LoadOptions): Promise<EhrInterp>;
