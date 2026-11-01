// @vitest-environment node
import { describe, expect, it } from "vitest";
import { endpointStatus } from "../scripts/tailscale-plugin";

const host = "desktop.example.ts.net";
const endpoint = `${host}:5173`;
const proxy = (target: string) => ({
  TCP: { "5173": { HTTPS: true }, "8080": { HTTPS: true } },
  Web: { [endpoint]: { Handlers: { "/": { Proxy: target } } } },
});

describe("automatic Tailscale preview", () => {
  it("can add an unused port without replacing other services", () => {
    expect(endpointStatus({ TCP: { "8080": { HTTPS: true } } }, host, 5173)).toBe("available");
  });
  it("reuses an existing loopback proxy", () => {
    for (const target of ["http://localhost:5173", "http://127.0.0.1:5173"])
      expect(endpointStatus(proxy(target), host, 5173)).toBe("reuse");
  });
  it("preserves occupied ports and different targets", () => {
    expect(endpointStatus(proxy("http://localhost:3000"), host, 5173)).toBe("conflict");
    expect(endpointStatus({ TCP: { "5173": { TCPForward: "localhost:5173" } } }, host, 5173)).toBe("conflict");
  });
  it("does not reuse a proxy enabled for public Funnel", () => {
    expect(endpointStatus({ ...proxy("http://localhost:5173"), AllowFunnel: { [endpoint]: true } }, host, 5173)).toBe("conflict");
  });
  it("detects routes owned by a foreground Serve process", () => {
    expect(endpointStatus({ Foreground: { session: proxy("http://127.0.0.1:5173") } }, host, 5173)).toBe("reuse");
    expect(endpointStatus({ Foreground: { session: proxy("http://localhost:3000") } }, host, 5173)).toBe("conflict");
  });
});
