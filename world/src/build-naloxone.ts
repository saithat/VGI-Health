/** Package the generation driver for CI workers that only receive binaries. */
import { chmodSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { nativeNaloxoneBinary } from "./naloxone";

const output = process.argv[2];
if (output === undefined) throw new Error("usage: tsx src/build-naloxone.ts OUTPUT");
copyFileSync(nativeNaloxoneBinary(), resolve(output));
chmodSync(resolve(output), 0o755);
