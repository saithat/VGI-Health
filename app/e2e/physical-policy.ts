import type { Page } from "@playwright/test";
import ownerPolicy from "../../docs/design/alert-urgency.json" with { type: "json" };
export type PhysicalFinding = { sc: string; id: string; detail: string };

export async function physicalBounds(
  page: Page,
  policy = ownerPolicy.physical,
): Promise<{ findings: PhysicalFinding[]; counts: Record<string, number> }> {
  return page.evaluate((policy) => {
    const findings: PhysicalFinding[] = [];
    const counts = { targets: 0, text: 0, svgText: 0, nontext: 0 };
    const styles = new Map<Element, CSSStyleDeclaration>();
    const style = (el: Element) => {
      let value = styles.get(el);
      if (!value) {
        value = getComputedStyle(el);
        styles.set(el, value);
      }
      return value;
    };
    const id = (el: Element) => {
      const path: string[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const semantic =
          e.getAttribute("data-comp-id") ||
          e.getAttribute("data-alert-id") ||
          e.getAttribute("data-info-id");
        if (semantic)
          return `${semantic}/${path.reverse().join("/") || e.tagName.toLowerCase()}`;
        const index = e.parentElement
          ? Array.from(e.parentElement.children)
              .filter((s) => s.tagName === e?.tagName)
              .indexOf(e) + 1
          : 1;
        path.push(`${e.tagName.toLowerCase()}:nth-of-type(${index})`);
      }
      return path.reverse().join("/");
    };
    const measureVisible = (el: Element) => {
      if (el.closest("[hidden], [inert], [aria-hidden='true'], script, style"))
        return false;
      if (!el.getClientRects().length) return false;
      for (let e: Element | null = el; e; e = e.parentElement)
        if (
          style(e).display === "none" ||
          style(e).visibility !== "visible" ||
          Number(style(e).opacity) === 0
        )
          return false;
      return true;
    };
    // A measurement is synchronous and never mutates the DOM. Reuse exact
    // layout/visibility reads within it, including repeated text ancestors.
    const boxes = new Map<Element, DOMRect>();
    const bounds = (el: Element) => {
      let box = boxes.get(el);
      if (!box) {
        box = el.getBoundingClientRect();
        boxes.set(el, box);
      }
      return box;
    };
    const visibility = new Map<Element, boolean>();
    const visible = (el: Element) => {
      let value = visibility.get(el);
      if (value === undefined) {
        value = measureVisible(el);
        visibility.set(el, value);
      }
      return value;
    };
    const add = (el: Element, sc: string, detail: string) =>
      findings.push({ sc, id: id(el), detail });
    type Color = [number, number, number, number];
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas color measurement unavailable");
    const colors = new Map<string, Color>();
    const color = (css: string): Color => {
      let result = colors.get(css);
      if (!result) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const px = ctx.getImageData(0, 0, 1, 1).data;
        result = [px[0] ?? 0, px[1] ?? 0, px[2] ?? 0, (px[3] ?? 0) / 255];
        colors.set(css, result);
      }
      return result;
    };
    const over = (ink: Color, paper: Color): Color => [
      ink[0] * ink[3] + paper[0] * (1 - ink[3]),
      ink[1] * ink[3] + paper[1] * (1 - ink[3]),
      ink[2] * ink[3] + paper[2] * (1 - ink[3]),
      1,
    ];
    const surfaces = new Map<Element, Color>();
    const surface = (el: Element | null): Color => {
      if (!el) return [255, 255, 255, 1];
      let value = surfaces.get(el);
      if (!value) {
        value = over(
          color(style(el).backgroundColor),
          surface(el.parentElement),
        );
        surfaces.set(el, value);
      }
      return value;
    };
    const luminance = (c: Color) => {
      const rgb = c.slice(0, 3).map((n) => {
        const v = n / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return (
        (rgb[0] ?? 0) * 0.2126 + (rgb[1] ?? 0) * 0.7152 + (rgb[2] ?? 0) * 0.0722
      );
    };
    const contrast = (a: Color, b: Color) => {
      const x = luminance(a),
        y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    // A whole-group opacity, image or blend needs pixel evidence; never infer a pass.
    const unsupported = new Set<Element>();
    const paintSupported = (el: Element) => {
      let ok = true;
      for (let e: Element | null = el; e; e = e.parentElement) {
        const s = style(e);
        if (
          s.backgroundImage !== "none" ||
          Number(s.opacity) !== 1 ||
          s.filter !== "none" ||
          s.mixBlendMode !== "normal"
        ) {
          ok = false;
          if (!unsupported.has(e)) {
            unsupported.add(e);
            add(
              e,
              "contrast-review",
              "Unsupported image/opacity/filter/blend needs pixel review",
            );
          }
        }
      }
      return ok;
    };
    const checkText = (
      el: Element,
      inkCss: string,
      suffix: string,
      opacity = 1,
    ) => {
      counts.text++;
      if (!paintSupported(el)) return;
      const paper = surface(el),
        baseInk = color(inkCss),
        ink: Color = [baseInk[0], baseInk[1], baseInk[2], baseInk[3]];
      ink[3] *= opacity;
      const ratio = contrast(over(ink, paper), paper);
      if (ratio < policy.textContrast)
        add(
          el,
          "1.4.3",
          `${suffix}: ${ratio.toFixed(4)}:1 < ${policy.textContrast}:1 (${inkCss})`,
        );
    };
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (el && node.textContent?.trim() && visible(el)) {
        const svgText = !!el.closest("svg");
        if (svgText) counts.svgText++;
        const ink = svgText ? style(el).fill : style(el).color;
        if (svgText && (ink === "none" || ink.includes("url(")))
          add(
            el,
            "contrast-review",
            "SVG text with stroke-only or gradient fill needs pixel review",
          );
        else
          checkText(
            el,
            ink,
            node.textContent.trim().slice(0, 60),
            svgText ? Number(style(el).fillOpacity) : 1,
          );
        const range = document.createRange();
        range.selectNodeContents(node);
        const textRects = Array.from(range.getClientRects());
        for (
          let ancestor: Element | null = el;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const box = bounds(ancestor),
            css = style(ancestor);
          const clipX = ["hidden", "clip"].includes(css.overflowX),
            clipY = ["hidden", "clip"].includes(css.overflowY);
          if (
            textRects.some(
              (r) =>
                (clipX && (r.left < box.left - 1 || r.right > box.right + 1)) ||
                (clipY && (r.top < box.top - 1 || r.bottom > box.bottom + 1)),
            )
          ) {
            add(
              el,
              "1.4.4/1.4.10",
              `text clipped by ${id(ancestor)}: ${node.textContent.trim().slice(0, 60)}`,
            );
            break;
          }
        }
      }
    }
    for (const el of document.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >("input, textarea")) {
      if (!visible(el)) continue;
      if (el.value && !["checkbox", "radio", "hidden"].includes(el.type))
        checkText(el, style(el).color, "control value");
      if (!el.value && el.placeholder) {
        const pseudo = getComputedStyle(el, "::placeholder");
        checkText(el, pseudo.color, "placeholder", Number(pseudo.opacity));
      }
    }
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, input:not([type='hidden']), select, textarea, a[href], [role='button'], [role='tab'], [role='checkbox'], [role='radio'], [role='switch'], [data-event]",
      ),
    ).filter(visible);
    for (const el of controls) {
      // Disabled controls have no pointer target. Text still follows the stricter hospital policy above.
      if (el.matches(":disabled, [aria-disabled='true']")) continue;
      // Avoid measuring a wrapper as well as its real nested control.
      if (
        el.matches("[data-event]") &&
        !el.matches("button, input, select, textarea, a[href], [role]") &&
        el.querySelector("button, input, select, textarea")
      )
        continue;
      counts.targets++;
      let rect = bounds(el);
      // A native checkbox's associated clickable label is part of the same target.
      if (
        el instanceof HTMLInputElement &&
        ["checkbox", "radio"].includes(el.type)
      ) {
        const label = Array.from(el.labels ?? []).find((label) =>
          label.contains(el),
        );
        if (label) rect = bounds(label);
      }
      if (rect.width < policy.targetCssPx || rect.height < policy.targetCssPx)
        add(
          el,
          "2.5.8",
          `${rect.width.toFixed(2)}×${rect.height.toFixed(2)} CSS px < ${policy.targetCssPx}×${policy.targetCssPx}`,
        );
      // Input boundaries convey the editable area; text-labelled buttons can be identified by text.
      if (
        el.matches(
          "input, textarea, select, [role='checkbox'], [role='radio'], [role='switch']",
        ) &&
        paintSupported(el)
      ) {
        counts.nontext++;
        const s = style(el),
          outside = surface(el.parentElement),
          inside = surface(el);
        const candidates = [contrast(inside, outside)];
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          if (
            parseFloat(s[`border${side}Width`]) > 0 &&
            !["none", "hidden"].includes(s[`border${side}Style`])
          ) {
            const border = over(color(s[`border${side}Color`]), inside);
            candidates.push(
              Math.min(contrast(border, outside), contrast(border, inside)),
            );
          }
        }
        if (Math.max(...candidates) < policy.nontextContrast)
          add(
            el,
            "1.4.11",
            `input boundary ${Math.max(...candidates).toFixed(4)}:1 < ${policy.nontextContrast}:1`,
          );
      }
    }
    // Explicitly selected tabs, checked toggles and focus indicators convey state.
    for (const el of document.querySelectorAll<HTMLElement>(
      "[aria-selected='true'], [aria-checked='true'], input:checked, :focus-visible",
    )) {
      if (!visible(el) || el.matches(":disabled") || !paintSupported(el))
        continue;
      const s = style(el),
        paper = surface(el),
        outside = surface(el.parentElement);
      const cues: number[] = [];
      if (parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== "none")
        cues.push(contrast(over(color(s.outlineColor), outside), outside));
      for (const side of ["Top", "Right", "Bottom", "Left"] as const)
        if (
          parseFloat(s[`border${side}Width`]) > 0 &&
          s[`border${side}Style`] !== "none"
        )
          cues.push(
            contrast(over(color(s[`border${side}Color`]), paper), paper),
          );
      if (el.matches("input:checked"))
        cues.push(
          contrast(
            color(s.accentColor === "auto" ? s.color : s.accentColor),
            paper,
          ),
        );
      counts.nontext++;
      if (!cues.length || Math.max(...cues) < policy.nontextContrast)
        add(
          el,
          "1.4.11",
          `state/focus indicator ${Math.max(0, ...cues).toFixed(4)}:1 < ${policy.nontextContrast}:1`,
        );
    }
    for (const el of document.querySelectorAll(
      "svg:not([aria-hidden='true']) :is(path, line, circle, rect, polyline, polygon, ellipse)",
    )) {
      if (!visible(el) || !paintSupported(el)) continue;
      const s = style(el),
        paper = surface(el);
      for (const [ink, opacity] of [
        [s.stroke, s.strokeOpacity],
        [s.fill, s.fillOpacity],
      ]) {
        if (!ink || ink === "none") continue;
        counts.nontext++;
        if (ink.includes("url(")) {
          add(
            el,
            "contrast-review",
            "SVG gradient/pattern paint needs pixel review",
          );
          continue;
        }
        const c = color(ink);
        const paint: Color = [c[0], c[1], c[2], c[3] * Number(opacity ?? 1)];
        const ratio = contrast(over(paint, paper), paper);
        if (ratio < policy.nontextContrast)
          add(
            el,
            "1.4.11",
            `graphic ${ratio.toFixed(4)}:1 < ${policy.nontextContrast}:1`,
          );
      }
    }
    for (const el of document.querySelectorAll(
      "img, canvas, video, svg use, [role='img']:not(svg)",
    ))
      if (visible(el))
        add(
          el,
          "contrast-review",
          "Raster, canvas, referenced or custom graphic needs pixel review",
        );
    // Reflow excludes only a contained two-dimensional table, not its surrounding prose or controls.
    for (const el of document.querySelectorAll<HTMLElement>(
      "body, main, section, p, label, button, input, select, textarea, h1, h2, h3, li, td, th",
    )) {
      if (!visible(el)) continue;
      const rect = bounds(el);
      const tableScroller = el.closest("table")?.parentElement;
      const tableException =
        !!tableScroller &&
        ["auto", "scroll"].includes(style(tableScroller).overflowX) &&
        bounds(tableScroller).right <= innerWidth + 1;
      if (
        !tableException &&
        (rect.left < -1 ||
          rect.right > innerWidth + 1 ||
          (el.scrollWidth > el.clientWidth + 1 &&
            ["hidden", "clip"].includes(style(el).overflowX)))
      )
        add(
          el,
          "1.4.10",
          `horizontal overflow/clipping at ${innerWidth}px (left ${rect.left.toFixed(1)}, right ${rect.right.toFixed(1)})`,
        );
    }
    return { findings, counts };
  }, policy);
}
