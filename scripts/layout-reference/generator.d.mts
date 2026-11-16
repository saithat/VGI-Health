export interface Viewport {w:number;h:number}
export interface Slot {path:number[];target:boolean;region:string;lines:number}
export interface Shape {slots:Slot[];hints:Record<string,{kind:string;role?:string;[key:string]:unknown}>}
export const version:string;
export const viewports:Viewport[];
export function occurrences(screen:unknown):{path:number[];kind:string;value:Record<string,unknown>}[];
export function shapeFor(screen:unknown):Shape;
export function layoutFor(shape:Shape|Slot[],viewport:Viewport):unknown;
export function fixedShellFor(shape:Shape|Slot[],viewport:Viewport):unknown;
export function eraseContent<T>(screen:T):T;
