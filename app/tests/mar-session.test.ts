import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event, State } from "../../lean/generated/ehr-types";
import type { Interp } from "../src/core/interp";
import { createMarSession } from "../src/core/marSession";
import {
  MarConflict,
  MarRejected,
  openMar,
  marCommit,
  marEvent,
  subscribeMar,
  type MarOpened,
} from "../src/data/commitService";

vi.mock("../src/data/commitService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/data/commitService")>()),
  openMar: vi.fn(),
  marCommit: vi.fn(),
  marEvent: vi.fn(),
  subscribeMar: vi.fn(() => vi.fn()),
}));
const before: State = {
  screen: "w4Admin",
  history: [],
  captured: [],
  receipts: [],
  acked: [],
  commits: [],
  expanded: [],
  tabSel: [],
  currentSlot: 0,
  clock: 0,
};
const committed = { ...before, commits: ["administerMed"] };
const click: Event = { click: { comp: "administer" } };
const entry: Event = {
  enter: { comp: "reason", value: { code: { c: "corrected" } } },
};
// Deliberately nonclinical stub: only models staging vs publication. Native guard
// and reducer correctness are exercised by the real Postgres/browser suites.
const interp: Interp = {
  init: () => JSON.stringify(before),
  step: (_spec, _program, _facts, _user, _state, event) =>
    JSON.stringify({
      state: event.includes('"click"') ? committed : before,
      result: "ok",
    }),
  view: () => "{}",
  render: () => "{}",
  facts: () => "{}",
};
const opened = (id = "first", version = 1): MarOpened => ({
  sessionId: id,
  revision: 0,
  version,
  state: structuredClone(before),
  projection: JSON.parse("{}"),
  spec: {},
  program: {},
  user: { id: "rn-a", role: "rn" },
  shared: { version: 0 },
});
const connection = { patient: "p", release: "nurse", workflow: "dose" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(openMar).mockResolvedValue(opened());
  vi.mocked(marEvent).mockResolvedValue({
    state: before,
    result: "ok",
    revision: 1,
  });
});
describe("MAR publication and reconciliation", () => {
  it("retains the exact intent/request ID after ambiguity and accepts no speculative commit", async () => {
    const session = await createMarSession(interp, connection);
    vi.mocked(marCommit).mockRejectedValueOnce(new Error("outcome unknown"));
    await expect(session.dispatch(click)).rejects.toThrow("outcome unknown");
    expect(session.getSnapshot().state.commits).toEqual([]);
    await expect(session.dispatch(entry)).rejects.toThrow(
      "Reconcile the previous save",
    );
    expect(marEvent).not.toHaveBeenCalled();
    vi.mocked(marCommit).mockResolvedValueOnce({
      state: committed,
      version: 2,
    });
    vi.mocked(openMar).mockResolvedValueOnce(opened("after", 2));
    await session.dispatch(click);
    expect(vi.mocked(marCommit).mock.calls[1]).toEqual(
      vi.mocked(marCommit).mock.calls[0],
    );
    session.close();
  });
  it("allows correction after a definite clinical rejection", async () => {
    const session = await createMarSession(interp, connection);
    vi.mocked(marCommit).mockRejectedValueOnce(
      new MarRejected("independent consent missing"),
    );
    await expect(session.dispatch(click)).rejects.toThrow("consent missing");
    await session.dispatch(entry);
    expect(marEvent).toHaveBeenCalledOnce();
    expect(session.getSnapshot().state.commits).toEqual([]);
    session.close();
  });
  it("refreshes after conflicts and SSE without carrying old captures or session generation", async () => {
    const session = await createMarSession(interp, connection);
    vi.mocked(openMar).mockResolvedValueOnce(opened("fresh", 2));
    vi.mocked(marCommit).mockRejectedValueOnce(
      new MarConflict("Another nurse administered this dose"),
    );
    await expect(session.dispatch(click)).rejects.toThrow("Another nurse");
    expect(session.getGeneration()).toBe("fresh");
    expect(session.getSnapshot().state.captured).toEqual([]);
    vi.mocked(openMar).mockResolvedValueOnce(opened("newest", 3));
    const notify = vi.mocked(subscribeMar).mock.calls[0]?.[2];
    if (!notify) throw new Error("SSE subscription missing");
    notify(3);
    await vi.waitFor(() => expect(session.getGeneration()).toBe("newest"));
    session.close();
  });
  it("keeps the reviewed successor when equal or older notifications arrive after a save", async () => {
    const session = await createMarSession(interp, connection);
    vi.mocked(marCommit).mockResolvedValueOnce({state:committed, version:2});
    vi.mocked(openMar).mockResolvedValueOnce(opened("after-save", 2));
    await session.dispatch(click);
    const notify = vi.mocked(subscribeMar).mock.calls[0]?.[2];
    if (!notify) throw new Error("SSE subscription missing");
    notify(2);
    notify(1);
    expect(openMar).toHaveBeenCalledTimes(2);
    expect(session.getGeneration()).toBe("after-save");
    await session.dispatch(entry);
    expect(vi.mocked(marEvent).mock.calls[0]?.[0]).toMatchObject({sessionId:"after-save", version:2});
    session.close();
  });
  it("reports a durable save as saved when the subsequent refresh fails, and blocks another write", async () => {
    const session = await createMarSession(interp, connection);
    vi.mocked(marCommit).mockResolvedValueOnce({
      state: committed,
      version: 2,
    });
    vi.mocked(openMar).mockRejectedValueOnce(new Error("connection lost"));
    expect(await session.dispatch(click)).toMatchObject({
      refreshRequired: true,
      message: expect.stringContaining("Administration saved"),
    });
    expect(session.getSnapshot().state.commits).toEqual(["administerMed"]);
    await expect(session.dispatch(click)).rejects.toThrow(
      "Administration saved",
    );
    expect(marCommit).toHaveBeenCalledOnce();
    session.close();
  });
});
