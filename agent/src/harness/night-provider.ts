import { z } from 'zod';

export const nightSearch = z.enum(['first', 'climb']);
export const nightProvider = z.enum(['codex', 'local']);
export const DEFAULT_MODEL_URL = 'http://127.0.0.1:8080/v1';
export const DEFAULT_LOCAL_MODEL = 'inkling-2-mini';
export const DEFAULT_CONTEXT_WINDOW = 131072;
export const MODEL_PORT = 18444;
export const contextWindowSchema = z.number().int().min(2);

/** Parse the operator's endpoint once. Never resolve a caller-supplied DNS name. */
export function modelEndpoint(value: string) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/[^?#\\\s]*)?$/i.test(value))
    throw Error('The night model URL must be HTTP on 127.0.0.1, localhost or [::1], without credentials, query or fragment');
  let url: URL;
  try { url = new URL(value); } catch { throw Error('Invalid night model URL'); }
  const port = Number(url.port || 80);
  if (!port) throw Error('Invalid night model port');
  const host = url.hostname === '[::1]' ? '::1' : '127.0.0.1';
  return { host, port, hostPort: `${url.hostname}:${port}`, pathname: url.pathname.replace(/\/+$/, '') };
}

export const recordedClimb = z.object({
  search: nightSearch.default('first'),
  wallMs: z.number(), reasoningEffort: z.string(),
  provider: nightProvider.optional(), model: z.string().optional(), serviceTier: z.string().optional(),
  hostPort: z.string().optional(), contextWindow: contextWindowSchema.optional(),
  basePathSha256: z.string().optional(),
}).strict();
