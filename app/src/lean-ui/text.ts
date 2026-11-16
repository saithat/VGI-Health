import type { Drawn, Part } from "./layout";
export const px = (n: number) => `${n / 64}px`;
export const rgb = (c: { r: number; g: number; b: number }) =>
  `rgb(${c.r},${c.g},${c.b})`;
const weights = [400, 600, 650, 700, 750, 800, 400, 400];
/** Each glyph cell is drawn where Lean measured it. When the part has runs,
 * Lean's cell counts say which cells belong to which run; the run's role is
 * exposed for styling and no text is composed or re-read here. */
export function paintText(d: Drawn, part?: Part): HTMLElement {
  const runRoles: string[] = [];
  (part?.runs ?? []).forEach((run, i) => {
    for (let n = part?.cells?.[i] ?? 0; n > 0; n--) runRoles.push(run.role);
  });
  let painted = 0;
  const text = document.createElement("div");
  text.className = "lean-lines";
  text.setAttribute("aria-hidden", "true");
  const slot = d.box.info.text;
  Object.assign(text.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
    overflowX: "hidden",
    overflowY: slot?.overflow === "scroll" ? "auto" : "visible",
    background: rgb(d.box.style.bg),
    fontFamily:
      slot?.font === 6
        ? "VGI Noto Sans Mono"
        : slot?.font === 7
          ? "VGI Noto Symbols"
          : "VGI World Sans, VGI Noto CJK, VGI Noto Hebrew",
    fontSize: px(slot?.fontSize ?? 896),
    fontWeight: String(weights[slot?.font ?? 0]),
    lineHeight: px(slot?.lineHeight ?? 1408),
  });
  for (const [i, line] of d.lines.entries()) {
    const span = document.createElement("span");
    span.dataset.line = String(i);
    const widths = d.glyphWidths[i] ?? [];
    Object.assign(span.style, {
      position: "absolute",
      left: "0",
      top: px(i * (slot?.lineHeight ?? 1408)),
      width: px(widths.reduce((s, n) => s + n, 0)),
      height: px(slot?.lineHeight ?? 1408),
      whiteSpace: "pre",
      direction: "ltr",
      unicodeBidi: "isolate",
    });
    // Match the research painter's isolated Hebrew runs; no browser shaping.
    const cells = Array.from(line).map((ch, j) => ({
      ch,
      width: widths[j] ?? 0,
      run: runRoles[painted++],
    }));
    const runs: { rtl: boolean; cells: typeof cells }[] = [];
    for (const cell of cells) {
      const last = runs.at(-1);
      const rtl =
        /[\u05d0-\u05ea\u05ef-\u05f4]/u.test(cell.ch) ||
        (cell.ch === " " && last?.rtl === true);
      if (!last || last.rtl !== rtl) runs.push({ rtl, cells: [] });
      runs.at(-1)?.cells.push(cell);
    }
    let x = 0;
    for (const run of runs)
      for (const cell of run.rtl ? [...run.cells].reverse() : run.cells) {
        const glyph = document.createElement("span");
        glyph.dataset.glyph = "";
        if (cell.run) glyph.dataset.run = cell.run;
        glyph.textContent = cell.ch;
        Object.assign(glyph.style, {
          position: "absolute",
          left: px(x),
          top: "0",
          width: px(cell.width),
        });
        span.append(glyph);
        x += cell.width;
      }
    text.append(span);
  }
  return text;
}
export function paintShape(d: Drawn): SVGSVGElement | undefined {
  const mark = d.box.info.mark;
  if (mark === "rect") return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const { w, h } = d.box.rect;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("aria-hidden", "true");
  Object.assign(svg.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });
  if (typeof mark === "object" && "plot" in mark) {
    svg.setAttribute("preserveAspectRatio", "none");
    for (const [i, points] of mark.plot.paths.entries()) {
      const path = document.createElementNS(svg.namespaceURI, "polyline");
      path.setAttribute("points", points.map((p) => `${p.x},${p.y}`).join(" "));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", rgb(d.box.style.fg));
      path.setAttribute("stroke-width", String(mark.plot.stroke));
      if (i > 0 && i < mark.plot.paths.length - 1)
        path.setAttribute("stroke-dasharray", "384 256");
      svg.append(path);
    }
    for (const point of mark.plot.dots) {
      const dot = document.createElementNS(svg.namespaceURI, "ellipse");
      dot.setAttribute("cx", String(point.x));
      dot.setAttribute("cy", String(point.y));
      dot.setAttribute("rx", "256");
      dot.setAttribute("ry", "256");
      dot.setAttribute("fill", rgb(d.box.style.fg));
      svg.append(dot);
    }
    return svg;
  }
  const shape = document.createElementNS(
    svg.namespaceURI,
    mark === "circle" ? "ellipse" : "polyline" in mark ? "polyline" : "path",
  );
  shape.setAttribute("fill", rgb(d.box.style.fg));
  if (mark === "circle") {
    for (const [key, value] of Object.entries({
      cx: w / 2,
      cy: h / 2,
      rx: w / 2,
      ry: h / 2,
    }))
      shape.setAttribute(key, String(value));
  } else if ("polyline" in mark) {
    shape.setAttribute(
      "points",
      mark.polyline.points.map((p) => `${p.x},${p.y}`).join(" "),
    );
    shape.setAttribute("fill", "none");
    shape.setAttribute("stroke", rgb(d.box.style.fg));
    shape.setAttribute("stroke-width", String(mark.polyline.stroke));
  } else {
    const { startNum, sweepNum, denominator } = mark.wedge;
    if (denominator <= 0) return;
    const sweep = Math.min(sweepNum, denominator),
      a = (2 * Math.PI * startNum) / denominator,
      b = a + (2 * Math.PI * sweep) / denominator;
    const x = (angle: number) => w / 2 + (w / 2) * Math.cos(angle),
      y = (angle: number) => h / 2 + (h / 2) * Math.sin(angle);
    shape.setAttribute(
      "d",
      sweep === denominator
        ? `M 0 ${h / 2} A ${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2} A ${w / 2} ${h / 2} 0 1 0 0 ${h / 2}`
        : `M ${w / 2} ${h / 2} L ${x(a)} ${y(a)} A ${w / 2} ${h / 2} 0 ${sweep * 2 > denominator ? 1 : 0} 1 ${x(b)} ${y(b)} Z`,
    );
  }
  svg.append(shape);
  return svg;
}
