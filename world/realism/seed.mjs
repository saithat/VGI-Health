#!/usr/bin/env node
// Realism belongs to the immutable baseline; no unguarded live migration.
import { main } from '../../infra/scripts/seed-world.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
