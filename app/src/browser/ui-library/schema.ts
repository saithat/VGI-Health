import { z } from 'zod';
const rect = z.object({ x:z.number(), y:z.number(), w:z.number(), h:z.number() });
const color = z.object({r:z.number(),g:z.number(),b:z.number()});
const point = z.object({x:z.number(),y:z.number()});
const slot = z.object({key:z.string(), maxLength:z.number(), maxLines:z.number(), overflow:z.enum(['wrap','ellipsis','scroll']), safety:z.boolean(), font:z.number(),fontSize:z.number(),lineHeight:z.number()});
const mark = z.union([z.literal('rect'),z.literal('circle'),z.object({wedge:z.object({startNum:z.number(),sweepNum:z.number(),denominator:z.number()})}),z.object({polyline:z.object({points:z.array(point),stroke:z.number()})})]);
export const drawn = z.object({box:z.object({rect,style:z.object({fg:color,bg:color,radius:z.number(),z:z.number()}),info:z.object({id:z.string(),source:z.array(z.number()).nullable(),text:slot.nullable(),target:z.boolean(),banner:z.boolean(),interruptive:z.boolean(),commit:z.boolean(),paint:z.boolean(),role:z.string(),mark}),scroll:z.boolean(),clip:rect.nullable(),clips:z.array(z.tuple([z.string(),rect]))}),lines:z.array(z.string()),glyphWidths:z.array(z.array(z.number())),original:z.string().nullable()});
export type Drawn = z.infer<typeof drawn>;
export interface PaintTree { drawn:Drawn; children:PaintTree[] }
export const tree:z.ZodType<PaintTree> = z.lazy(()=>z.object({drawn,children:z.array(tree)}));
export const output = z.object({accepted:z.boolean(),viewport:z.object({w:z.number(),h:z.number()}),tree,boxes:z.array(drawn),lineWidths:z.array(z.array(z.number())),findings:z.array(z.object({rule:z.string(),metric:z.string(),warning:z.boolean()}))});
export type Output = z.infer<typeof output>;
