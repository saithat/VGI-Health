/** Runs in Chromium via locator.evaluate; keep this function self-contained. */
export function inspectVisibility(element: Element, minimum: number): string[] {
  const errors: string[] = [];
  const initial = element.getBoundingClientRect();
  // Long pages may scroll vertically. Horizontal off-page content is a failure.
  window.scrollTo(
    0,
    window.scrollY + initial.top + initial.height / 2 - window.innerHeight / 2,
  );
  const rect = element.getBoundingClientRect();
  const doc = document.documentElement;
  const docTop = rect.top + window.scrollY;
  if (rect.width <= 0 || rect.height <= 0) errors.push("zero bounding box");
  if (
    rect.left < 0 ||
    rect.right > doc.clientWidth + 1 ||
    docTop < 0 ||
    docTop + rect.height > doc.scrollHeight + 1
  )
    errors.push("outside the page");
  const cx = rect.left + rect.width / 2,
    cy = rect.top + rect.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  if (!hit || !(hit === element || element.contains(hit)))
    errors.push(
      `covered or off-screen at center (${hit?.tagName ?? "no hit"})`,
    );
  for (
    let ancestor: Element | null = element;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    const style = getComputedStyle(ancestor);
    if (Number(style.opacity) <= 0 || style.visibility !== "visible")
      errors.push("invisible ancestor");
  }
  for (const child of [element, ...element.querySelectorAll("*")]) {
    const style = getComputedStyle(child);
    if (Number(style.opacity) <= 0) errors.push("transparent content");
    if (parseFloat(style.fontSize) < minimum)
      errors.push(`font ${style.fontSize} below ${minimum}px`);
  }
  return errors;
}
