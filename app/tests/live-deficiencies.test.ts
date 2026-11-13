// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { startDraftService } from "./live-drafts-support";
import {
  leave,
  search,
  open,
  entry,
  alert,
  ack,
  sign,
} from "../../services/commit/test/drafts-fixture";
import { nativeInterp } from "../../services/commit/test/native-interp";
import { createLiveSession } from "../src/core/liveSession";
import type { Event } from "../../lean/generated/ehr-types";

const transport = vi.hoisted(() => ({
  base: "",
  token: "",
  requests: new Array<string>(),
}));
vi.mock("../src/data/commitService", async (original) => {
  const actual = await original<typeof import("../src/data/commitService")>();
  async function request(path: string, body?: unknown) {
    // Test transport forwards every request to the real isolated authority.
    transport.requests.push(path);
    // eslint-disable-next-line boundary/single-data-module
    const response = await fetch(transport.base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${transport.token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data;
  }
  return {
    ...actual,
    marRequest: request,
    openMar: (input: unknown) => request("/sessions", input),
    marEvent: (s: { sessionId: string; revision: number }, event: unknown) =>
      request(`/sessions/${s.sessionId}/events`, {
        revision: s.revision,
        event,
      }),
  };
});
let service: Awaited<ReturnType<typeof startDraftService>> | undefined;
beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
  service = await startDraftService();
  transport.base = service.base;
  transport.token = service.token;
  vi.stubGlobal("sessionStorage", { getItem: () => null });
});
afterAll(async () => {
  await service?.close();
  vi.unstubAllGlobals();
});
it.skipIf(!process.env.DATABASE_URL)(
  "deficiency work list is painted from the stored list and replays natively",
  async () => {
    if (!service) throw new Error("Missing service");
    const live = service;
    const user = {
      persona: "P1",
      role: "physician",
      practitioner: { resourceType: "Practitioner", id: "P1" },
    } as const;
    const start = () =>
      createLiveSession(
        nativeInterp(),
        live.spec,
        live.program,
        live.directory,
        user,
      );
    let session = await start();
    const paint = () => {
      const ui = session.getSnapshot().ui;
      if (!ui) throw new Error("Missing screen");
      session.onPaint(ui);
      return ui;
    };
    async function dispatch(event: Event) {
      const result = await session.dispatch(event);
      paint();
      return result;
    }
    paint();
    await dispatch(search("draft-B"));
    await dispatch(open("draft-B"));
    await dispatch({
      enter: { comp: "noteField", value: { text: { s: "Unsigned B" } } },
    });
    await dispatch(leave);
    // A new workspace reads the stored list computed by native Lean.
    const before = transport.requests.length;
    session = await start();
    expect(transport.requests.slice(before)).toContain("/deficiencies");
    const nav = paint().nav.flatMap(([, entries]) => entries);
    expect(
      nav.find(([id]) => id === "workspace.activity|deficiencies")?.[1],
    ).toMatch(/^Deficiencies \(\d+\)$/);
    await dispatch({ click: { comp: "workspace.activity|deficiencies" } });
    expect(session.getSnapshot().state.patientContext?.activity).toBe(
      "deficiencies",
    );
    const list = JSON.stringify(paint().workspace);
    expect(list).toContain("Unsigned draft: Sign note");
    const row = /workspace\.open\|draft-B\|\d+\|deficiencies/.exec(list)?.[0];
    if (!row) throw new Error("No deficiency row for draft-B");
    await dispatch({ click: { comp: row } });
    expect(session.getSnapshot().state.patientContext?.patient).toBe("draft-B");
    await dispatch(entry);
    await dispatch(alert);
    await dispatch(ack);
    expect((await dispatch(sign))?.message).toBe("Saved: Sign note");
  },
  180_000,
);
