/** Route clinical entries, including old bookmarks, to the Lean host. */
export function leanEntry(href: string): string | undefined {
  const url = new URL(href);
  if (!["/", "/ehr"].includes(url.pathname.replace(/\/$/, "") || "/")) return;
  if (["mar", "adt"].includes(url.searchParams.get("workflow") ?? "")) return;
  url.searchParams.delete("workflow");
  url.searchParams.delete("shell");
  url.searchParams.delete("mode");
  return `/lean.html${url.search}${url.hash}`;
}
