/** Transport-level interface every LLM backend implements: one JSON-schema-constrained call. */

export type BackendName = 'claude' | 'codex' | 'replay' | 'scripted';

export interface JsonRequest {
  /** Stable id, e.g. "night-03/P1/propose-0"; the replay backend looks recordings up by it. */
  callId: string;
  purpose: string;
  system: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
}

export interface JsonResponse {
  json: unknown;
  backend: BackendName;
  /** Requested model id (for replay: the model of the original recording). */
  model: string;
  /** Model that actually served the call, when the API reports it (fallbacks can change it). */
  servedBy: string | null;
  replayOf: { backend: string; model: string; source: string } | null;
  promptMatched: boolean | null;
  usage: unknown;
  transcript?: unknown;
}

export interface JsonLlm {
  readonly name: BackendName;
  readonly model: string;
  complete(req: JsonRequest): Promise<JsonResponse>;
}
