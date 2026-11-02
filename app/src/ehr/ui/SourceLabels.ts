import { createContext } from "react";
import type { Pair } from "./types";

/** Readable source text comes from Lean; raw provenance remains metadata. */
export const SourceLabelsContext = createContext<Pair[]>([]);
export const EntryHintsContext = createContext<Pair[]>([]);
