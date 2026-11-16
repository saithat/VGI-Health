import { afterEach, expect, test, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  history.replaceState(null, "", "/");
  vi.resetModules();
});
for (const custom of [false, true])
  test(`PKCE token exchange retains ${custom ? "the Lean page callback" : "the existing default callback"}`, async () => {
    vi.resetModules();
    const redirectUri = `${location.origin}/lean.html`;
    sessionStorage.setItem(
      "vgi.mar.login",
      JSON.stringify({
        verifier: "synthetic-test-verifier",
        state: "test-state",
        returnTo: "/lean.html?persona=P1",
        ...(custom ? { redirectUri } : {}),
      }),
    );
    history.replaceState(null, "", "/?code=one-use-test-code&state=test-state");
    const transport = vi.fn(
      async (_input: unknown, init?: RequestInit) =>
        new Response(
          JSON.stringify(
            init?.method === "POST"
              ? {
                  access_token: "synthetic-only-token",
                  refresh_token: "synthetic-only-refresh",
                  expires_in: 3600,
                }
              : { user: { id: "P1", role: "physician" }, persona: "P1" },
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", transport);
    const { restoreMar } = await import("../src/data/commitService");
    expect((await restoreMar(redirectUri))?.persona).toBe("P1");
    const body = transport.mock.calls[0]?.[1]?.body;
    expect(body instanceof URLSearchParams).toBe(true);
    if (!(body instanceof URLSearchParams)) throw new Error("No form body");
    expect(body.get("redirect_uri")).toBe(
      custom ? redirectUri : `${location.origin}/?workflow=chart`,
    );
    expect(body.get("code_verifier")).toBe("synthetic-test-verifier");
    expect(location.pathname + location.search).toBe("/lean.html?persona=P1");
    expect(sessionStorage.getItem("vgi.mar.login")).toBeNull();
  });
