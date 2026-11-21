// @vitest-environment node
import { IncomingMessage, type IncomingHttpHeaders } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import {
  csrfAllowed,
  loopback,
  recordingArgs,
} from "../scripts/local-recording";

const configuration = {
  runId: "visit-1",
  days: "10",
  personas: ["P1", "P3"],
  screens: "lean",
  backend: "codex",
  model: "example/model-1",
  reasoningEffort: "high",
  world: "2",
  resume: false,
  replayFrom: "",
};

describe("local recording arguments", () => {
  it("maps UI choices to fixed flags", () => {
    expect(recordingArgs(configuration).args).toEqual([
      "--days",
      "10",
      "--personas",
      "P1,P3",
      "--screens",
      "lean",
      "--world",
      "runs/world/2",
      "--parallel",
      "--backend",
      "codex",
      "--model",
      "example/model-1",
      "--reasoning-effort",
      "high",
    ]);
    expect(
      recordingArgs(
        {
          ...configuration,
          backend: "replay",
          resume: true,
          replayFrom: "from-run",
        },
        false,
      ).args,
    ).toEqual([
      "--days",
      "10",
      "--personas",
      "P1,P3",
      "--screens",
      "lean",
      "--world",
      "runs/world/2",
      "--resume",
      "--backend",
      "replay",
      "--replay-from",
      "runs/from-run",
    ]);

  });

  it("passes the local night settings separately from the release backend model", () => {
    const local = { ...configuration, nightProvider:"local", nightModel:"inkling-2-mini",
      nightBaseUrl:"http://[::1]:8888/v1", nightContextWindow:"64000" };
    expect(recordingArgs(local).args.slice(-8)).toEqual(["--night-provider","local","--night-base-url",
      "http://[::1]:8888/v1","--night-model","inkling-2-mini","--night-context-window","64000"]);
    expect(() => recordingArgs({...local, nightBaseUrl:"http://example.com/v1"})).toThrow();
    expect(() => recordingArgs({...local, nightContextWindow:"-1"})).toThrow();
  });

  it.each([
    { runId: "../run" },
    { runId: "--resume" },
    { world: "/opt/world" },
    { replayFrom: "../run" },
    { model: "--out" },
    { model: "model; sleep 1" },
    { personas: ["P1", "P1"] },
    { personas: ["P6"] },
    { backend: "shell" },
    { days: "1 --resume" },
    { reasoningEffort: "fast" },
    { screens: "audit" },
    { args: ["--runs-root", "/opt"] },
  ])("rejects arbitrary input %j", (change) => {
    expect(() => recordingArgs({ ...configuration, ...change })).toThrow();
  });
});

const host = "127.0.0.1:4186";
const token = "local-test-token";
const request = (
  headers: IncomingHttpHeaders = {},
  remote = "127.0.0.1",
  local = "127.0.0.1",
) => {
  const socket = new Socket();
  Object.defineProperties(socket, {
    localAddress: { value: local },
    remoteAddress: { value: remote },
    localPort: { value: 4186 },
  });
  const req = new IncomingMessage(socket);
  req.headers = {
    host,
    origin: `http://${host}`,
    "sec-fetch-site": "same-origin",
    "x-vgi-csrf": token,
    "content-type": "application/json; charset=UTF-8",
    ...headers,
  };
  return req;
};

describe("local recording request guard", () => {
  it("accepts the same origin with the issued token", () => {
    expect(csrfAllowed(request(), token)).toBe(true);
  });

  it.each([
    { origin: undefined },
    { origin: "http://localhost:4186" },
    { origin: "https://site.example" },
    { origin: "null" },
    { host: "local.example:4186" },
    { "content-type": "text/plain" },
    { "x-vgi-csrf": undefined },
    { "x-vgi-csrf": "local-test-fake" },
    { "x-vgi-csrf": "ü" },
    { "sec-fetch-site": "cross-site" },
    { "x-forwarded-host": host },
    { forwarded: "for=127.0.0.1" },
  ])("rejects invalid headers %j", (headers) => {
    expect(csrfAllowed(request(headers), token)).toBe(false);
  });

  it("rejects a non-loopback socket or listener", () => {
    expect(loopback(request({}, "192.0.2.1"))).toBe(false);
    expect(loopback(request({}, "127.0.0.1", "192.0.2.1"))).toBe(false);
  });
});
