/**
 * RFC 6902 JSON Patch, with tag/id selector segments resolved to indexes just
 * before each op is applied (see `jsonPatchOpSchema` in schema.ts).
 *
 *   /screens/[id=signOrders]/components/[tag=allergyList]/size
 *   /screens/[id=signOrders]/components/[id=btnSign]+        (insert after)
 */
import type { JsonPatchOp } from './schema.js';

export class PatchError extends Error {
  constructor(message: string, readonly opIndex: number) {
    super(`patch op ${opIndex}: ${message}`);
  }
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function unescape(seg: string): string {
  return seg.replace(/~1/g, '/').replace(/~0/g, '~');
}

function escape(seg: string): string {
  return seg.replace(/~/g, '~0').replace(/\//g, '~1');
}

function parsePointer(path: string, opIndex: number): string[] {
  if (path === '') return [];
  if (!path.startsWith('/')) throw new PatchError(`pointer must start with "/": ${path}`, opIndex);
  return path.slice(1).split('/').map(unescape);
}

const SELECTOR = /^\[([^=\]]+)=([^\]]*)\](\+?)$/;

function resolveSegment(container: unknown, seg: string, opIndex: number): string {
  const m = SELECTOR.exec(seg);
  if (!m) return seg;
  if (!Array.isArray(container)) throw new PatchError(`selector ${seg} applied to a non-array`, opIndex);
  const key = m[1] ?? '';
  const value = m[2] ?? '';
  const idx = container.findIndex((el) => isRecord(el) && String(el[key]) === value);
  if (idx < 0) throw new PatchError(`no element with ${key}=${value}`, opIndex);
  return String(m[3] === '+' ? idx + 1 : idx);
}

function child(node: unknown, seg: string, opIndex: number): unknown {
  if (Array.isArray(node)) {
    const i = arrayIndex(seg, node.length - 1, opIndex);
    return node[i];
  }
  if (isRecord(node)) {
    if (!(seg in node)) throw new PatchError(`missing key "${seg}"`, opIndex);
    return node[seg];
  }
  throw new PatchError(`cannot descend into a scalar at "${seg}"`, opIndex);
}

function arrayIndex(seg: string, max: number, opIndex: number): number {
  if (!/^(0|[1-9][0-9]*)$/.test(seg)) throw new PatchError(`bad array index "${seg}"`, opIndex);
  const i = Number(seg);
  if (i > max) throw new PatchError(`array index ${i} out of range`, opIndex);
  return i;
}

/** Resolve selectors along a pointer; returns the parent node and the resolved segments. */
function locate(doc: unknown, path: string, opIndex: number): { parent: unknown; key: string; segs: string[] } {
  const raw = parsePointer(path, opIndex);
  if (raw.length === 0) throw new PatchError('root pointer not supported here', opIndex);
  const segs: string[] = [];
  let node = doc;
  for (let i = 0; i < raw.length - 1; i++) {
    const seg = resolveSegment(node, raw[i] ?? '', opIndex);
    segs.push(seg);
    node = child(node, seg, opIndex);
  }
  const key = resolveSegment(node, raw[raw.length - 1] ?? '', opIndex);
  segs.push(key);
  return { parent: node, key, segs };
}

function getAt(doc: unknown, path: string, opIndex: number): { value: unknown; segs: string[] } {
  if (path === '') return { value: doc, segs: [] };
  const { parent, key, segs } = locate(doc, path, opIndex);
  return { value: child(parent, key, opIndex), segs };
}

function addAt(doc: unknown, path: string, value: unknown, opIndex: number): string[] {
  const { parent, key, segs } = locate(doc, path, opIndex);
  if (Array.isArray(parent)) {
    if (key === '-') {
      parent.push(value);
      segs[segs.length - 1] = String(parent.length - 1);
    } else {
      parent.splice(arrayIndex(key, parent.length, opIndex), 0, value);
    }
  } else if (isRecord(parent)) {
    parent[key] = value;
  } else {
    throw new PatchError('add target parent is a scalar', opIndex);
  }
  return segs;
}

function removeAt(doc: unknown, path: string, opIndex: number): { value: unknown; segs: string[] } {
  const { parent, key, segs } = locate(doc, path, opIndex);
  if (Array.isArray(parent)) {
    const i = arrayIndex(key, parent.length - 1, opIndex);
    const [removed] = parent.splice(i, 1);
    return { value: removed, segs };
  }
  if (isRecord(parent)) {
    if (!(key in parent)) throw new PatchError(`remove: missing key "${key}"`, opIndex);
    const value = parent[key];
    delete parent[key];
    return { value, segs };
  }
  throw new PatchError('remove target parent is a scalar', opIndex);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isRecord(a) && isRecord(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], b[k]));
  }
  return false;
}

const toPointer = (segs: string[]): string => (segs.length === 0 ? '' : '/' + segs.map(escape).join('/'));

export interface PatchResult {
  doc: unknown;
  /** The same patch with every selector resolved to a plain RFC 6902 index path. */
  resolved: JsonPatchOp[];
}

/** Apply a patch to a deep copy of `doc`. Throws PatchError on the first failing op. */
export function applyPatch(doc: unknown, ops: readonly JsonPatchOp[]): PatchResult {
  let root: unknown = structuredClone(doc);
  const resolved: JsonPatchOp[] = [];
  ops.forEach((op, i) => {
    switch (op.op) {
      case 'add': {
        if (op.path === '') { root = structuredClone(op.value); resolved.push(op); break; }
        const segs = addAt(root, op.path, structuredClone(op.value), i);
        resolved.push({ ...op, path: toPointer(segs) });
        break;
      }
      case 'remove': {
        const { segs } = removeAt(root, op.path, i);
        resolved.push({ ...op, path: toPointer(segs) });
        break;
      }
      case 'replace': {
        if (op.path === '') { root = structuredClone(op.value); resolved.push(op); break; }
        const { segs } = removeAt(root, op.path, i);
        addAt(root, toPointer(segs), structuredClone(op.value), i);
        resolved.push({ ...op, path: toPointer(segs) });
        break;
      }
      case 'move': {
        const removed = removeAt(root, op.from, i);
        const segs = addAt(root, op.path, removed.value, i);
        resolved.push({ ...op, from: toPointer(removed.segs), path: toPointer(segs) });
        break;
      }
      case 'copy': {
        const got = getAt(root, op.from, i);
        const segs = addAt(root, op.path, structuredClone(got.value), i);
        resolved.push({ ...op, from: toPointer(got.segs), path: toPointer(segs) });
        break;
      }
      case 'test': {
        const got = getAt(root, op.path, i);
        if (!deepEqual(got.value, op.value)) throw new PatchError(`test failed at ${op.path}`, i);
        resolved.push({ ...op, path: toPointer(got.segs) });
        break;
      }
    }
  });
  return { doc: root, resolved };
}

/** Pointers touched by a patch (for compatibility checks between candidates). */
export function touchedPaths(ops: readonly JsonPatchOp[]): string[] {
  return ops.flatMap((op) => ('from' in op ? [op.from, op.path] : [op.path]));
}
