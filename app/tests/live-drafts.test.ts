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

const transport = vi.hoisted(() => ({ base: "", token: "" }));
vi.mock("../src/data/commitService", async (original) => {
  const actual = await original<typeof import("../src/data/commitService")>();
  async function request(path: string, body?: unknown) {
    // Test transport forwards every request to the real isolated authority.
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
  "live host carries exact drafts through A/B/A and signs with native service replay",
  async () => {
    if (!service) throw new Error("Missing service");
    const session = await createLiveSession(
      nativeInterp(),
      service.spec,
      service.program,
      service.directory,
      {
        persona: "P1",
        role: "physician",
        practitioner: { resourceType: "Practitioner", id: "P1" },
      },
    );
    const paint = () => {
      const ui = session.getSnapshot().ui;
      if (!ui) throw new Error("Missing screen");
      session.onPaint(ui);
    };
    async function dispatch(event: Event) {
      const result = await session.dispatch(event);
      paint();
      return result;
    }
    async function select(patient: string) {
      await dispatch(search(patient));
      await dispatch(open(patient));
    }
    paint();
    await select("draft-A");
    await dispatch(entry);
    await dispatch(alert);
    expect(session.getSnapshot().state.popup).toBeTruthy();
    await dispatch(ack);
    const original = structuredClone(session.getSnapshot().state);
    await dispatch(leave);
    expect(session.getSnapshot().state.patientDrafts?.[0]?.captured).toEqual(
      original.captured,
    );
    await select("draft-B");
    expect(session.getSnapshot().state.captured).toEqual([]);
    expect(session.getSnapshot().state.acked).toEqual([]);
    await dispatch({
      enter: { comp: "noteField", value: { text: { s: "Patient B note" } } },
    });
    await dispatch(leave);
    await select("draft-A");
    expect(session.getSnapshot().state.captured).toEqual(original.captured);
    expect(session.getSnapshot().state.acked).toEqual(original.acked);
    await dispatch(alert);
    expect(session.getSnapshot().state.popup).toBeUndefined();
    expect((await dispatch(sign))?.message).toBe("Saved: Sign note");
    expect(session.getSnapshot().state.patientDrafts?.[0]?.patient).toBe(
      "draft-B",
    );
    await dispatch(leave);
    await select("draft-A");
    expect(session.getSnapshot().state.captured).toEqual([]);
    expect(session.getSnapshot().state.acked).toEqual(original.acked);
  },
  120_000,
);
