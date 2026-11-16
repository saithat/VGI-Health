#!/usr/bin/env node
import { tsImport } from '../../agent/node_modules/tsx/dist/esm/api/index.mjs';
await tsImport('./rules-benchmark-run.mts',import.meta.url);
