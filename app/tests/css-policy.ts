import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

/** Offline-only review policy: fail closed on layout mechanisms that conceal. */
export function lintCss(css: string, expectedClasses: Set<string>): string[] {
  const errors: string[] = [],
    found = new Set<string>();
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    selectorParser((selectors) =>
      selectors.walkClasses((c) => {
        found.add(c.value);
      }),
    ).processSync(rule.selector);
  });
  root.walkDecls(({ prop, value }) => {
    prop = prop.toLowerCase();
    value = value
      .toLowerCase()
      .replace(/\s*!important\s*$/, "")
      .trim();
    const negative = /(^|[\s,(])-(?:\d|\.\d)/.test(value);
    const zero = /(^|\s)0(?:px|rem|em|vh|vw|%|pt|ch)?(?=\s|$)/.test(value);
    if (
      (prop === "display" && /^(none|contents)$/.test(value)) ||
      (prop === "visibility" && /hidden|collapse/.test(value)) ||
      (prop === "opacity" && Number(value) <= 0) ||
      (/^overflow(?:-[xy])?$/.test(prop) && /hidden|clip/.test(value)) ||
      (/^(?:min-|max-)?(?:width|height|inline-size|block-size)$/.test(prop) &&
        (zero || negative)) ||
      (/^(?:top|right|bottom|left|inset(?:-.+)?|margin(?:-.+)?|text-indent)$/.test(
        prop,
      ) &&
        negative) ||
      /^(?:clip|clip-path|transform|translate|scale|content-visibility|animation(?:-.+)?|transition(?:-.+)?)$/.test(
        prop,
      ) ||
      (prop === "position" && /absolute|fixed/.test(value)) ||
      (prop === "font-size" && (zero || negative)) ||
      (prop === "filter" && /opacity\(0/.test(value)) ||
      value.includes("var(") ||
      /calc\(/.test(value) ||
      prop.startsWith("--")
    )
      errors.push(`${prop}: ${value}`);
  });
  for (const cls of expectedClasses)
    if (!found.has(cls)) errors.push(`Missing class ${cls}`);
  for (const cls of found)
    if (!expectedClasses.has(cls)) errors.push(`Extra class ${cls}`);
  return errors;
}
