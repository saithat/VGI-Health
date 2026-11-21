export interface SpecReviewItem {
  file: string;
  line: number;
  kind: string;
  name: string;
  note: string;
  code: string;
  scope: "declaration" | "section" | "inline";
  docstring?: string | null;
  truncated: boolean;
}
export interface SpecReview {
  schemaVersion: 1;
  sourceDigest: string;
  filesScanned: number;
  total: number;
  kinds: Record<string, number>;
  items: SpecReviewItem[];
}
export const repoRoot: string;
export function parseLean(
  file: string,
  source: string,
): (SpecReviewItem & { stop?: number })[];
export function buildSpecReview(root?: string): Promise<SpecReview>;
