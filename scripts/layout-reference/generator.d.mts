export interface Viewport {w:number;h:number}
export interface Slot {path:number[];target:boolean;region:string;lines:number}
export interface Shape {slots:Slot[];hints:Record<string,{kind:string;role?:string;[key:string]:unknown}>}
export const version:string;
export const viewports:Viewport[];
export interface Occurrence {path:number[];role:string;target:boolean;commit:boolean;comp:string;ids:string[];
  kind?:string;value?:Record<string,unknown>;leaf?:boolean;of?:string;row?:number;col?:number;narrative?:boolean}
export function occurrences(screen:unknown):Occurrence[];
export function shapeFor(screen:unknown):Shape;
export function layoutFor(shape:Shape|Slot[],viewport:Viewport):unknown;
export function fixedShellFor(shape:Shape|Slot[],viewport:Viewport):unknown;
export function eraseContent<T>(screen:T):T;
