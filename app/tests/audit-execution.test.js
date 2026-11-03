import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  dedupeFiles,
  expandMeasurements,
  failureKind,
  retryableTests,
  exactGrep,
  reportTests,
  recoverTimeouts,
  workerCount,
  isAgentScreenCheck,
} from "../scripts/audit-execution.mjs";

const failed = (message, status = "failed", extra = {}) => ({
  title: "physical policy: /x/a[1].json",
  project: "desktop",
  expectedStatus: "passed",
  run: { status, errors: [{ message, ...extra }] },
});
describe("audit execution", () => {
  it("retries infrastructure timeouts and crashes, never assertion or mixed batches", () => {
    for (const test of [
      failed("Test timeout of 30000ms exceeded", "timedOut"),
      failed("page.waitForFunction: Timeout 30000ms exceeded"),
      failed("page.goto: Timeout 30000ms exceeded"),
      failed("worker process exited unexpectedly (code=null, signal=SIGKILL)"),
    ]) {
      expect(failureKind(test)).toBe("timeout");
      expect(retryableTests([test])).toEqual([test]);
    }
    expect(retryableTests([failed("Timeout")], [], true)).toEqual([]);
    const assertion = failed(
      "expect(locator).toBeVisible() timeout exceeded",
      "failed",
      { matcherResult: {} },
    );
    expect(failureKind(assertion)).toBe("assertion");
    expect(retryableTests([assertion])).toEqual([]);
    expect(retryableTests([failed("Timeout"), assertion])).toEqual([]);
    expect(
      retryableTests([failed("Timeout")], [{ message: "webServer failed" }]),
    ).toEqual([]);
    expect(failureKind(failed("TypeError: bug"))).toBe("error");
    const selected = failed("Timeout");
    expect(
      new RegExp(exactGrep([selected])).test(
        `desktop ui-check.spec.ts ${selected.title}`,
      ),
    ).toBe(true);
    expect(
      new RegExp(exactGrep([selected])).test("physical policy: /x/a1.json"),
    ).toBe(false);
  });
  it("retries only timed-out project/title pairs twice, halving workers and replacing partial attempts", () => {
    const timeout = { ...failed("Timeout"), title: "A" };
    const passed = {
      ...timeout,
      project: "narrow",
      run: { status: "passed", attachments: [{ name: "kept" }] },
    };
    const first = {
      result: { status: 1 },
      tests: [timeout, passed],
      errors: [],
    };
    const calls = [];
    const recovered = recoverTimeouts(first, {
      workers: 10,
      run: (attempt, workers, targets, project) => {
        calls.push({ attempt, workers, targets, project });
        return {
          result: { status: attempt === 1 ? 1 : 0 },
          errors: [],
          tests: [
            {
              ...timeout,
              run: {
                status: attempt === 1 ? "timedOut" : "passed",
                attachments: [{ name: "final" }],
              },
            },
          ],
        };
      },
    });
    expect(
      calls.map(({ attempt, workers, project }) => ({
        attempt,
        workers,
        project,
      })),
    ).toEqual([
      { attempt: 1, workers: 5, project: "desktop" },
      { attempt: 2, workers: 2, project: "desktop" },
    ]);
    expect(
      calls.every(
        (call) =>
          call.targets.length === 1 && call.targets[0].project === "desktop",
      ),
    ).toBe(true);
    expect(recovered.retries).toHaveLength(2);
    expect(recovered.tests).toEqual([
      {
        ...timeout,
        run: { status: "passed", attachments: [{ name: "final" }] },
      },
      passed,
    ]);
    expect(recovered.exitCode).toBe(0);
    const exhausted = recoverTimeouts(first, { workers: 1, run: () => first });
    expect(exhausted.retries.map((retry) => retry.workers)).toEqual([1, 1]);
    expect(failureKind(exhausted.tests[0])).toBe("timeout");
    const missing = recoverTimeouts(first, {
      workers: 6,
      run: () => ({ result: { status: 0 }, tests: [], errors: [] }),
    });
    expect(missing.errors[0].message).toContain("omitted selected tests");
    const never = () => {
      throw new Error("A finding must not be retried");
    };
    const assertion = recoverTimeouts(
      { ...first, tests: [failed("expect(received).toEqual(expected)")] },
      { workers: 6, run: never },
    );
    expect(assertion.retries).toEqual([]);
    const physical = recoverTimeouts(first, {
      workers: 6,
      run: never,
      hasFindings: () => true,
    });
    expect(physical.retries).toEqual([]);
  });
  it("uses the last attempt and keeps project identities distinct", () => {
    const tests = reportTests({
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  title: "same",
                  tests: [
                    {
                      projectName: "desktop",
                      results: [{ status: "timedOut" }, { status: "passed" }],
                    },
                    {
                      projectName: "narrow",
                      results: [{ status: "timedOut" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(failureKind(tests[0])).toBe(null);
    expect(retryableTests(tests)).toEqual([tests[1]]);
  });
  it("dedupes exact trees only within the context and preserves every state and finding", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "audit-dedupe-"));
    try {
      const files = ["a.json", "b.json", "c.json", "d-geometry.json"].map(
        (name) => resolve(dir, name),
      );
      files.forEach((file, index) =>
        writeFileSync(file, index === 2 ? '{"x":2}' : '{"x":1}'),
      );
      const entries = dedupeFiles(files, "build+bundle+settings");
      expect(entries.map((entry) => entry.representative)).toEqual([
        files[0],
        files[0],
        files[2],
        files[3],
      ]);
      expect(dedupeFiles(files, "changed-bundle")[0].key).not.toBe(
        entries[0].key,
      );
      expect(
        dedupeFiles(files, "same", false).map((entry) => entry.representative),
      ).toEqual(files);
      const measurement = {
        file: files[0],
        measurements: [
          {
            width: 320,
            findings: [{ sc: "1.4.10", detail: "overflow" }],
            counts: { targets: 5 },
          },
        ],
      };
      expect(expandMeasurements(entries, [measurement])).toEqual([
        measurement,
        { ...measurement, file: files[1] },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("bounds workers by configuration and the lane's 8 GiB memory budget", () => {
    expect(
      workerCount(
        { EHR_SCREEN_WORKERS: "10", EHR_SCREEN_MAX_WORKERS: "8" },
        64 * 1024 ** 3,
      ),
    ).toBe(8);
    expect(workerCount({ EHR_SCREEN_WORKERS: "12" }, 3 * 1024 ** 3)).toBe(2);
    expect(workerCount({ EHR_SCREEN_WORKERS: "12" }, 64 * 1024 ** 3)).toBe(12);
  });
  it("exempts only the existing private nightly-agent protocol from locking", () => {
    expect(
      isAgentScreenCheck(
        { EHR_SCREEN_RESULT: "/tmp/screens-abc/gate-result.json" },
        ["/tmp/screens-abc/b0/a.json"],
      ),
    ).toBe(true);
    expect(
      isAgentScreenCheck({ EHR_SCREEN_RESULT: "/tmp/audit/result.json" }, [
        "/tmp/audit/a.json",
      ]),
    ).toBe(false);
    expect(
      isAgentScreenCheck(
        { EHR_SCREEN_RESULT: "/tmp/screens-abc/gate-result.json" },
        ["/tmp/elsewhere/a.json"],
      ),
    ).toBe(false);
  });
});
