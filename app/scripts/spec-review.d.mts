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
  lineCount: number;
  declarationKind?: string;
  classification: "trusted" | "proven" | "unverified";
}
export interface SpecReview {
  schemaVersion: 2;
  classes: Record<"trusted" | "proven" | "unverified", number>;
  trustedDeclarations: number;
  trustedReviewLines: number;
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
): (Omit<SpecReviewItem, "classification"> & { stop?: number })[];
export function buildSpecReview(root?: string): Promise<SpecReview>;

export function classifyItems(
  items: Omit<SpecReviewItem, "classification">[],
  surface: {
    declarations: string[];
    locations: {
      name?: string;
      file: string;
      line: number | null;
      endLine: number | null;
    }[];
  },
): SpecReviewItem[];
