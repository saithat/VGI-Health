import type { GeometryAtlas } from '../../app/src/metrics/geometry.js';
import type { DayResult } from './schema.js';
export interface GeometrySelection { resultKey?: string; day?: number; result?: Pick<DayResult,'day'|'persona'|'trace'|'observations'> }
export function readStoredGeometry(file: string, read: (file: string) => Promise<unknown>, selection?: GeometrySelection, storageDirectory?: string): Promise<GeometryAtlas>;
