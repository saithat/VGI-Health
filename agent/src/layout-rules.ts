/** Untrusted shape-generic transforms. Only native family-check can admit output. */
import { z } from 'zod';
import { layoutFor, shapeFor, occurrences, type Viewport } from '../../scripts/layout-reference/generator.mjs';
const selector = z.object({ id: z.string().min(1).optional(), role: z.string().min(1).optional(), kind: z.string().min(1).optional() }).strict()
    .refine(s => Boolean(s.id || s.role || s.kind), 'selector needs id, role or kind');
export const layoutRuleSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('firstViewport'), target: selector }).strict(),
    z.object({ kind: z.literal('pin'), target: selector }).strict(),
    z.object({ kind: z.literal('region'), target: selector, region: z.enum(['body', 'side']) }).strict(),
    z.object({ kind: z.literal('columns'), target: selector, count: z.number().int().positive(), tracks: z.array(z.number().positive()).min(1).optional() }).strict(),
    z.object({ kind: z.literal('order'), targets: z.array(selector).min(1) }).strict(),
    z.object({ kind: z.literal('beside'), target: selector, anchor: selector }).strict(),
]);
export type LayoutRule = z.infer<typeof layoutRuleSchema>;
export class LayoutRuleRefusal extends Error {
}
type Node = {
    type: string;
    id?: string | undefined;
    source?: number[] | undefined;
    position: {
        x: number;
        y: number;
    };
    width: number;
    height: number;
    children?: Node[] | undefined;
    [key: string]: unknown;
};
const nodeSchema: z.ZodType<Node> = z.lazy(() => z.object({ type: z.string(), id: z.string().optional(), source: z.array(z.number()).optional(), position: z.object({ x: z.number(), y: z.number() }), width: z.number(), height: z.number(), children: z.array(nodeSchema).optional() }).passthrough());
function required<T>(value: T | undefined): T { if (value === undefined)
    throw new LayoutRuleRefusal('incomplete dense tree or rule target'); return value; }
type Block = {
    node: Node;
    children: Block[];
    columns?: number;
    tracks?: number[];
    region?: string;
};
const key = (p: number[]) => p.join('.');
const gap = 4 * 64;
/** Start with layoutFor on every shape/viewport. Semantic flags/text are never authored by rules. */
export function applyLayoutRules(ui: Record<string, unknown>, viewport: Viewport, rules: readonly LayoutRule[]): unknown {
    const tree = nodeSchema.parse(layoutFor(shapeFor(ui), viewport));
    if (!rules.length)
        return tree;
    const treeChildren = required(tree.children);
    const scroll = treeChildren.find(n => n.type === 'Scroll');
    const content = scroll?.children?.[0];
    if (!scroll || !content)
        throw new LayoutRuleRefusal('dense reference has no body scroll');
    const cards = content.children ?? [];
    const blocks = new Map<string, Block>(cards.filter(n => n.source).map(node => [key(required(node.source)), { node, children: [] }]));
    const roots: Block[] = [];
    const slots = shapeFor(ui).slots;
    for (const block of blocks.values()) {
        if (slots.find(s => key(s.path) === key(required(block.node.source)))?.region === 'side' && required(block.node.source)[0] !== 2)
            block.region = 'side';
        const parent = blocks.get(key(required(block.node.source).slice(0, -1)));
        (parent?.children ?? roots).push(block);
    }
    const semantic = occurrences(ui);
    const select = (s: z.infer<typeof selector>): Block[] => {
        // Rules move whole nodes: match a node's own part, never its label/control/unit parts.
        const matches = semantic.filter(o => o.value !== undefined && !o.leaf && (!s.id || [o.comp, o.value.comp, o.value.id].includes(s.id)) && (!s.kind || o.kind === s.kind) && (!s.role || o.value.role === s.role));
        if (!matches.length)
            throw new LayoutRuleRefusal(`unknown target ${JSON.stringify(s)} on screen ${String(ui.screen)}`);
        return matches.map(o => {
            const block = blocks.get(key(o.path));
            if (!block)
                throw new LayoutRuleRefusal(`target ${JSON.stringify(s)} is fixed/safety geometry; use a literal checked tree`);
            return block;
        });
    };
    const container = (b: Block): Block[] => [...blocks.values()].find(p => p.children.includes(b))?.children ?? roots;
    const detach = (b: Block) => { const list = container(b); const i = list.indexOf(b); if (i < 0)
        throw new LayoutRuleRefusal('target already pinned'); list.splice(i, 1); };
    const pinned: Block[] = [];
    for (const [i, rule] of rules.entries()) {
        try {
            if (rule.kind === 'order') {
                const targets = rule.targets.flatMap(select);
                if (new Set(targets).size !== targets.length)
                    throw new LayoutRuleRefusal('duplicate order target');
                const list = container(required(targets[0]));
                if (!targets.every(t => container(t) === list))
                    throw new LayoutRuleRefusal('order targets must be siblings');
                const order = [...targets, ...list.filter(t => !targets.includes(t))];
                list.splice(0, list.length, ...order);
            }
            else if (rule.kind === 'beside') {
                const targets = select(rule.target), anchors = select(rule.anchor);
                if (targets.length !== 1 || anchors.length !== 1)
                    throw new LayoutRuleRefusal('beside needs one target and one anchor');
                const a = required(anchors[0]), b = required(targets[0]);
                if (a === b || key(required(a.node.source)).startsWith(key(required(b.node.source)) + '.') || key(required(b.node.source)).startsWith(key(required(a.node.source)) + '.'))
                    throw new LayoutRuleRefusal('beside targets must be disjoint');
                detach(b);
                const list = container(a), index = list.indexOf(a);
                if (index < 0)
                    throw new LayoutRuleRefusal('anchor already pinned');
                // A decoration-only wrapper merges both blocks; it invents no occurrence.
                const wrapper: Block = { node: { type: 'Absolute', position: { x: 0, y: 0 }, width: content.width, height: 0 }, children: [a, b], columns: 2 };
                blocks.set(`wrapper-${i}`, wrapper);
                list.splice(index, 1, wrapper);
            }
            else {
                const selected = select(rule.target);
                for (const b of rule.kind === 'firstViewport' ? [...selected].reverse() : selected) {
                    if (rule.kind === 'columns') {
                        if (!b.children.length)
                            throw new LayoutRuleRefusal('columns target has no visible children');
                        if (rule.tracks && rule.tracks.length !== rule.count)
                            throw new LayoutRuleRefusal('tracks length must equal count');
                        b.columns = rule.count;
                        if (rule.tracks)
                            b.tracks = rule.tracks;
                    }
                    else if (rule.kind === 'firstViewport') {
                        detach(b);
                        b.region = 'body';
                        roots.unshift(b);
                    }
                    else if (rule.kind === 'region') {
                        detach(b);
                        b.region = rule.region;
                        roots.push(b);
                    }
                    else {
                        detach(b);
                        pinned.push(b);
                    }
                }
            }
        }
        catch (error) {
            throw new LayoutRuleRefusal(`rule ${i} (${rule.kind}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    const output: Node[] = [];
    // Reflow complete occurrence subtrees; preserve dense cards, flags and text capacity.
    const render = (b: Block, x: number, y: number, w: number, out: Node[]): number => {
        if (b.node.source)
            out.push({ ...b.node, position: { x, y }, width: w });
        let cursor = y + b.node.height + (b.node.source ? gap : 0);
        const rows: Block[][] = [];
        for (const child of b.children) {
            const last = rows.at(-1);
            if (last && (b.columns ? last.length < b.columns : required(last[0]).node.position.y === child.node.position.y))
                last.push(child);
            else
                rows.push([child]);
        }
        for (const row of rows) {
            const count = b.columns ?? row.length, sum = b.tracks?.reduce((a, b) => a + b, 0) ?? count;
            let cx = x;
            const bottoms: number[] = [];
            for (const [j, child] of row.entries()) {
                const cw = Math.floor((w - gap * (count - 1)) * (b.tracks?.[j] ?? 1) / sum);
                bottoms.push(render(child, cx, cursor, cw, out));
                cx += cw + gap;
            }
            cursor = Math.max(cursor, ...bottoms) + gap;
        }
        return Math.max(y + b.node.height, cursor - gap);
    };
    let y = 0, sideY = 0;
    const hasSide = roots.some(b => b.region === 'side'), sideW = 158 * 64;
    for (const b of roots) {
        if (b.region === 'side')
            sideY = render(b, 0, sideY, sideW, output) + gap;
        else
            y = render(b, hasSide ? sideW + gap : 0, y, content.width - (hasSide ? sideW + gap : 0), output) + gap;
    }
    output.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
    content.children = output;
    content.height = Math.max(y, sideY);
    // Reserve a fixed row immediately above the commit bar; the native checker
    // decides whether targets, modal separation, density and containment hold.
    if (pinned.length) {
        const fixed: Node[] = [];
        let top = 0;
        for (const b of pinned)
            top = render(b, scroll.position.x, top, scroll.width, fixed) + gap;
        scroll.height -= top;
        const start = scroll.position.y + scroll.height;
        const index = treeChildren.findIndex(n => n.commit);
        treeChildren.splice(index < 0 ? treeChildren.length : index, 0, ...fixed.map(n => ({ ...n, position: { ...n.position, y: n.position.y + start }, z: 20 })));
    }
    return tree;
}
/** Compact, content-free outline of the dense starting layout. First N items
 * in each column are inside both the viewport and their outer scroll clip. */
export function denseOutline(ui: Record<string, unknown>, viewport: Viewport) {
    const tree = nodeSchema.parse(layoutFor(shapeFor(ui), viewport));
    const slots = shapeFor(ui).slots, ids = new Map(occurrences(ui).filter(o => o.value !== undefined && !o.leaf).map(o => [key(o.path), o.comp || o.value?.comp || o.value?.id || o.kind]));
    const regions = new Map<string, Map<string, {
        x: number;
        scrolls: string[];
        firstViewport: number;
        items: unknown[];
    }>>();
    function visit(n: Node, x = 0, y = 0, scrolls: string[] = [], clipBottom = viewport.h) {
        x += n.position.x;
        y += n.position.y;
        const source = n.source;
        if (source) {
            const region = slots.find(s => key(s.path) === key(source))?.region ?? 'body';
            const columns = regions.get(region) ?? new Map();
            regions.set(region, columns);
            const columnKey = JSON.stringify([x, scrolls]);
            const column = columns.get(columnKey) ?? { x: x / 64, scrolls, firstViewport: 0, items: [] };
            columns.set(columnKey, column);
            column.items.push(ids.get(key(source)) ?? key(source));
            if (y >= 0 && y + n.height <= clipBottom)
                column.firstViewport++;
        }
        for (const c of n.children ?? [])
            visit(c, x, y, n.type === 'Scroll' ? [...scrolls, n.id ?? 'scroll'] : scrolls, n.type === 'Scroll' ? Math.min(clipBottom, y + n.height) : clipBottom);
    }
    visit(tree);
    return { viewport, firstViewportMeaning: 'first N items of each column fit the viewport and outer scroll clip; inner safety-text scrolling remains possible', regions: [...regions].map(([region, columns]) => ({ region, columns: [...columns.values()].sort((a, b) => a.x - b.x) })) };
}
