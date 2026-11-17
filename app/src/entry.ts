/** Clinical chart work opens the Lean page. The React encounter/login shell
 * stays selectable with `?shell=encounter` (its own Keycloak callbacks carry
 * `code`/`state`/`error`); ADT, the MAR dose list, replay, the dashboard and
 * the browser keep their renderers. */
export function leanEntry(href: string): string | undefined {
  const url = new URL(href);
  const path = url.pathname.replace(/\/$/, "") || "/";
  const workflow = url.searchParams.get("workflow");
  if (
    !["/", "/ehr"].includes(path) ||
    (workflow !== null && workflow !== "chart") ||
    ["mode", "shell", "code", "state", "error"].some((k) =>
      url.searchParams.has(k),
    )
  )
    return undefined;
  url.searchParams.delete("workflow");
  return `/lean.html${url.search}${url.hash}`;
}
