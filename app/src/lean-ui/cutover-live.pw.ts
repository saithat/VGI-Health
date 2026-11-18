import { test, expect, type Page } from "@playwright/test";
import { z } from "zod";
import { startPainterService } from "../../tests/lean-painter-support";
import {
  act,
  connectService,
  control,
  fill,
  idle,
  navigate,
  reveal,
  saved,
  viewports,
} from "./live-helpers";

/** Cut-over regressions for `/lean.html` against an isolated real commit
 * service (native replay, guards, Postgres). Identity is the local synthetic
 * OIDC issuer these tests use: the page runs its own PKCE login and logout;
 * only the issuer's authorization, token and logout endpoints are answered
 * here. Deployed identity provisioning is outside these tests. */
test.skip(!process.env.DATABASE_URL, "Needs an isolated Postgres DATABASE_URL");
test.setTimeout(240000);

interface Identity {
  auth: URLSearchParams[];
  token: URLSearchParams[];
  logout: URLSearchParams[];
}
async function identity(
  page: Page,
  persona: string,
  base: string,
  token: string,
): Promise<Identity> {
  const seen: Identity = { auth: [], token: [], logout: [] };
  await connectService(page, persona, base, token, { pending: false });
  await page.route("**/protocol/openid-connect/token", async (route) => {
    seen.token.push(new URLSearchParams(route.request().postData() ?? ""));
    await route.fallback();
  });
  await page.route(/\/protocol\/openid-connect\/auth\?/, (route) => {
    const query = new URL(route.request().url()).searchParams;
    seen.auth.push(query);
    const target = new URL(query.get("redirect_uri") ?? "");
    target.searchParams.set("code", `synthetic-${persona}`);
    target.searchParams.set("state", query.get("state") ?? "");
    target.searchParams.set("iss", "synthetic");
    return route.fulfill({ status: 302, headers: { Location: target.href } });
  });
  await page.route(/\/protocol\/openid-connect\/logout\?/, (route) => {
    const query = new URL(route.request().url()).searchParams;
    seen.logout.push(query);
    return route.fulfill({
      status: 302,
      headers: { Location: query.get("post_logout_redirect_uri") ?? "/" },
    });
  });
  return seen;
}
/** Opens `path` signed out, signs in, and requires the return URL intact. */
async function signIn(
  page: Page,
  path: string,
  persona: string,
  seen: Identity,
) {
  await page.goto(path);
  const login = page.getByRole("button", { name: `Sign in as ${persona}` });
  await expect(login).toBeVisible();
  await login.click();
  await expect(page.locator("#root")).toHaveAttribute("data-accepted", "true");
  await idle(page);
  const origin = new URL(page.url()).origin;
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(path);
  const auth = seen.auth.at(-1);
  expect(auth?.get("redirect_uri")).toBe(`${origin}/lean.html`);
  expect(auth?.get("client_id")).toBe("vgi-mar");
  expect(auth?.get("response_type")).toBe("code");
  expect(auth?.get("code_challenge_method")).toBe("S256");
  expect(auth?.get("login_hint")).toBe(persona.toLowerCase());
  const exchange = seen.token.at(-1);
  expect(exchange?.get("grant_type")).toBe("authorization_code");
  expect(exchange?.get("redirect_uri")).toBe(`${origin}/lean.html`);
  expect(exchange?.get("code")).toBe(`synthetic-${persona}`);
}

test("sign-in, return URL and sign-out on /lean.html", async ({ page }) => {
  const service = await startPainterService("P1");
  try {
    const seen = await identity(
      page,
      "P1",
      service.base,
      service.tokens.P1 ?? "",
    );
    const path =
      "/lean.html?persona=P1&audit=buttons&date=2026-11-15&baseline=0";
    await signIn(page, path, "P1", seen);
    await expect(control(page, "workspace.lookup", "click")).toBeEnabled();
    // A reload in the same tab restores the identity session silently and
    // returns to the same address.
    await page.reload();
    await expect(page.locator("#root")).toHaveAttribute(
      "data-accepted",
      "true",
    );
    expect(seen.auth.length).toBe(2);
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(
      path,
    );
    // Sign out ends the identity session and returns to the registered page.
    const origin = new URL(page.url()).origin;
    // Sign out is a Lean target: a navigation link in the checked layout,
    // with its own admitted box, and its click never reaches the session.
    const signOut = control(page, "session.signOut", "click");
    // Only home/worklist screens offer it (Layout.isHome): here the
    // patient-selection worklist landing; a deep clinical screen has none.
    await expect(page.locator("#root")).toHaveAttribute(
      "data-screen",
      /^workspace:/,
    );
    await expect(signOut).toHaveCount(1);
    await act(page, control(page, "workspace.lookup", "click"));
    await fill(page, control(page, "workspace.search", "enter"), "Painter");
    await act(
      page,
      page.locator('[data-comp-id^="workspace.open|"][data-event="click"]'),
    );
    await navigate(page, "w1Orders");
    await expect(page.locator("#root")).toHaveAttribute(
      "data-accepted",
      "true",
    );
    await expect(signOut).toHaveCount(0);
    await expect(page.getByText("Sign out", { exact: true })).toHaveCount(0);
    // The Program's own home screen also offers it.
    await navigate(page, "home");
    await expect(signOut).toHaveCount(1);
    const box = await signOut.evaluate((e) => {
      const id = e.closest<HTMLElement>("[data-box]")?.dataset.box;
      const i = window.__leanPaint?.boxes.findIndex(
        (d) => d.box.info.id === id,
      );
      const part = i === undefined ? undefined : window.__leanPaint?.parts?.[i];
      const drawn = i === undefined ? undefined : window.__leanPaint?.boxes[i];
      return {
        accepted: window.__leanPaint?.accepted,
        target: part?.target,
        comp: part?.comp,
        w: drawn ? drawn.box.rect.w / 64 : 0,
        h: drawn ? drawn.box.rect.h / 64 : 0,
      };
    });
    expect(box).toMatchObject({
      accepted: true,
      target: true,
      comp: "session.signOut",
    });
    expect(box.w).toBeGreaterThanOrEqual(24);
    expect(box.h).toBeGreaterThanOrEqual(24);
    await expect(page.locator("#sign-out")).toHaveCount(0);
    const events: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/commit/sessions/")) events.push(r.url());
    });
    await reveal(page, signOut);
    await signOut.click();
    await expect(
      page.getByRole("button", { name: "Sign in as P1" }),
    ).toBeVisible();
    expect(seen.logout.at(-1)?.get("post_logout_redirect_uri")).toBe(
      `${origin}/lean.html`,
    );
    expect(seen.logout.at(-1)?.get("client_id")).toBe("vgi-mar");
    expect(events, "sign-out sent no clinical event").toEqual([]);
    expect(
      await page.evaluate(() => sessionStorage.getItem("vgi.oidc.session")),
    ).toBeNull();
    // Signed out stays signed out: no silent login after a reload.
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Sign in as P1" }),
    ).toBeVisible();
    expect(seen.auth.length).toBe(2);
    await expect(page.locator("#root")).not.toHaveAttribute(
      "data-accepted",
      "true",
    );
  } finally {
    await service.close();
  }
});

for (const viewport of viewports)
  test(`P2 board at ${viewport.width}×${viewport.height}: repeated IDs, separate sessions, drafts, signing and navigation`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const service = await startPainterService("P2");
    try {
      const seen = await identity(
        page,
        "P2",
        service.base,
        service.tokens.P2 ?? "",
      );
      await signIn(
        page,
        "/lean.html?persona=P2&audit=buttons&date=2026-11-15&patients=painter-patient,painter-second",
        "P2",
        seen,
      );
      const inPane = (patient: string, comp: string, event = "click") =>
        page.locator(
          `[data-patient="${patient}"] [data-comp-id=${JSON.stringify(comp)}][data-event="${event}"]`,
        );
      const a = (comp: string, event?: string) =>
        inPane("painter-patient", comp, event);
      const b = (comp: string, event?: string) =>
        inPane("painter-second", comp, event);
      // Repeated component IDs: one control per pane, each patient-bound.
      await expect(control(page, "workspace.lookup", "click")).toHaveCount(2);
      await expect(a("workspace.lookup")).toHaveCount(1);
      await expect(b("workspace.lookup")).toHaveCount(1);
      await act(page, a("workspace.lookup"));
      await fill(page, a("workspace.search", "enter"), "Alex");
      // A pane offers only its own patient.
      await expect(
        page.locator(
          '[data-patient="painter-patient"] [data-comp-id^="workspace.open|painter-second|"]',
        ),
      ).toHaveCount(0);
      await act(
        page,
        page.locator(
          '[data-patient="painter-patient"] [data-comp-id^="workspace.open|painter-patient|"]',
        ),
      );
      await act(page, b("workspace.lookup"));
      await fill(page, b("workspace.search", "enter"), "Blair");
      await act(
        page,
        page.locator(
          '[data-patient="painter-second"] [data-comp-id^="workspace.open|painter-second|"]',
        ),
      );
      if (await a("chartSummary.patientCare.w3Triage").count())
        await act(page, a("chartSummary.patientCare.w3Triage"));
      else {
        if (await a("home.work.w3TrackBoard").count())
          await act(page, a("home.work.w3TrackBoard"));
        await act(page, a("w3TrackBoard.nav.w3Triage"));
      }
      for (const [id, value] of Object.entries({
        chiefComplaint: "Headache",
        triageAcuity: "3",
        arrivalMode: "walk-in",
        weight: "80",
        bpSystolic: "120",
        bpDiastolic: "80",
        heartRate: "72",
        respRate: "16",
        temperature: "37",
        spo2: "98",
        painScore: "2",
        isolationScreen: "false",
      }))
        await fill(page, a(`w3Triage.${id}`, "enter"), value);
      if (await a("w3Triage.review.allergyList").count())
        await act(page, a("w3Triage.review.allergyList"));
      await act(page, a("w3Triage.next"));
      const note = {
        hpi: "Mild headache, no red flags.",
        ros: "Otherwise negative.",
        exam: "Alert with normal neurologic examination.",
        assessmentPlan: "Supportive care and return precautions.",
        medRecDecision: "continue",
        claimDiagnosis: "R51.9",
        levelOfService: "99213",
      };
      for (const [id, value] of Object.entries(note))
        await fill(page, a(`w3Provider.${id}`, "enter"), value);
      // Drafts: leave the note for another screen and come back; the entered
      // text is still the pane's draft, and the other pane has none of it.
      await act(page, a("w3Provider.nav.w3Disposition"));
      await act(page, a("w3Disposition.dischargeGroup"));
      for (const [id, value] of Object.entries({
        visitDiagnosis: "R51.9",
        patientInstructions: "Return for worsening headache or new symptoms.",
        followUp: "Primary care in one week",
      }))
        await fill(page, a(`w3Disposition.${id}`, "enter"), value);
      await act(page, a("w3Disposition.nav.w3Provider"));
      await expect(a("w3Provider.hpi", "enter")).toHaveValue(note.hpi);
      await expect(a("w3Provider.exam", "enter")).toHaveValue(note.exam);
      await expect(b("w3Provider.hpi", "enter")).toHaveCount(0);
      // Pane B navigates independently while pane A holds its draft.
      if (await b("chartSummary.patientCare.w3Triage").count()) {
        await act(page, b("chartSummary.patientCare.w3Triage"));
        await expect(b("w3Triage.chiefComplaint", "enter")).toHaveValue("");
      }
      await expect(a("w3Provider.hpi", "enter")).toHaveValue(note.hpi);
      // Signing in pane A commits only patient A.
      const sign = a("w3Provider.commit.signNote");
      await reveal(page, sign);
      await expect(sign).toBeEnabled();
      const response = saved(page);
      await act(page, sign);
      const result = await response;
      expect(result.status(), await result.text()).toBe(201);
      expect(await result.text()).toContain("DocumentReference/");
      const read = async (patient: string) =>
        z.object({ version: z.number() }).parse(
          await (
            await page.request.get(`${service.base}/patients/${patient}`, {
              headers: { Authorization: `Bearer ${service.tokens.P2}` },
            })
          ).json(),
        ).version;
      expect(await read("painter-patient")).toBeGreaterThan(1);
      expect(await read("painter-second")).toBe(1);
      // The other pane's session continues: its controls remain enabled.
      await expect(
        b("workspace.lookup").or(b("w3Triage.next")).first(),
      ).toBeEnabled();
    } finally {
      await service.close();
    }
  });

const marChart = z.object({
  version: z.number(),
  snapshot: z.object({
    bundle: z.object({
      entry: z.array(
        z.object({
          resource: z
            .object({
              resourceType: z.string(),
              status: z.string().optional(),
            })
            .passthrough(),
        }),
      ),
    }),
  }),
});
async function chart(page: Page, base: string, token: string, patient: string) {
  const response = await page.request.get(`${base}/patients/${patient}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(200);
  const read = marChart.parse(await response.json());
  return {
    version: read.version,
    administrations: read.snapshot.bundle.entry
      .map((e) => e.resource)
      .filter((r) => r.resourceType === "MedicationAdministration"),
  };
}
async function openDose(page: Page) {
  await navigate(page, "w4Worklist");
  await act(page, control(page, "w4Worklist.review.allergyList", "click"));
  await act(page, control(page, "w4Worklist.toMar", "click"));
  await act(page, control(page, "w4Mar.openDue", "click"));
  await expect(page.locator("#root")).toHaveAttribute("data-screen", "w4Admin");
}
async function documentDose(
  page: Page,
  patient: string,
  medication: string,
  status: string,
) {
  await fill(page, control(page, "w4Admin.wristbandScan", "enter"), patient);
  await fill(page, control(page, "w4Admin.medScan", "enter"), medication);
  await fill(page, control(page, "w4Admin.adminStatus", "enter"), status);
  await fill(
    page,
    control(page, "w4Admin.adminReason", "enter"),
    "Scheduled medication administered",
  );
}
/** Acknowledges the interruptive alerts a commit raises, then returns the
 * service's command response (or none if no command was sent). */
async function administer(page: Page) {
  const button = control(page, "w4Admin.commit.administerMed", "click");
  for (let attempt = 0; attempt < 10; attempt++) {
    await reveal(page, button);
    await expect(button).toBeEnabled();
    const response = saved(page)
      .then((r) => r)
      .catch(() => null);
    await button.click();
    await idle(page);
    const ack = page.locator('[data-event="ack"]');
    if (await ack.count()) {
      await ack.first().click();
      await idle(page);
      continue;
    }
    return response;
  }
  throw Error("Alerts did not settle");
}
const marUrl = (patient: string, workflow: string) =>
  `/lean.html?persona=P3&audit=buttons&marPatient=${patient}&marRelease=mar&marWorkflow=${workflow}`;

test("MAR on /lean.html: blocked controls, every documented outcome, duplicate attempts through the shared dose authority", async ({
  page,
}) => {
  const service = await startPainterService("P3");
  const token = service.tokens.P3 ?? "";
  try {
    const seen = await identity(page, "P3", service.base, token);
    await signIn(page, marUrl("painter-patient", "dose"), "P3", seen);
    await openDose(page);
    // Blocked: before the five rights are scanned, the commit is disabled and
    // its complete blocked reason is its own Lean part.
    const commit = control(page, "w4Admin.commit.administerMed", "click");
    await expect(commit).toBeDisabled();
    const reason = await commit.evaluate((e) =>
      (e.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.getAttribute("aria-label"))
        .join(" "),
    );
    expect(reason.trim().length).toBeGreaterThan(0);
    const outcomes = ["held", "refused", "not-given", "delayed", "given"];
    for (const [index, status] of outcomes.entries()) {
      if (index > 0) await openDose(page);
      await documentDose(page, "painter-patient", "amoxicillin", status);
      const response = await administer(page);
      expect(response, status).not.toBeNull();
      if (!response) return;
      expect(response.status(), await response.text()).toBe(201);
      const body = z
        .object({ outcome: z.literal("persisted"), version: z.number() })
        .parse(await response.json());
      expect(body.version).toBe(index + 2);
      await expect(page.locator("#status")).toContainText(
        /Administration saved/,
      );
      const read = await chart(page, service.base, token, "painter-patient");
      expect(read.version).toBe(index + 2);
      expect(read.administrations).toHaveLength(index + 1);
    }
    // Duplicate: the given dose is consumed. A second administration of the
    // same scheduled dose is refused by the shared dose authority.
    await openDose(page);
    await documentDose(page, "painter-patient", "amoxicillin", "given");
    const duplicate = await administer(page);
    expect(duplicate?.status()).toBe(409);
    expect(await duplicate?.text()).toContain("dose_already_administered");
    const final = await chart(page, service.base, token, "painter-patient");
    expect(final.administrations).toHaveLength(outcomes.length);
    expect(
      final.administrations.filter((a) => a.status === "completed"),
    ).toHaveLength(1);
  } finally {
    await service.close();
  }
});

test("MAR on /lean.html: a rapid double activation and a stale attempt commit at most once", async ({
  browser,
  baseURL,
}) => {
  const service = await startPainterService("P3");
  const token = service.tokens.P3 ?? "";
  if (!baseURL) throw Error("Playwright baseURL missing");
  const first = await browser.newContext({ baseURL });
  const second = await browser.newContext({ baseURL });
  try {
    const pages = [await first.newPage(), await second.newPage()];
    for (const page of pages) {
      const seen = await identity(page, "P3", service.base, token);
      await signIn(page, marUrl("painter-patient", "dose"), "P3", seen);
      await openDose(page);
    }
    const [a, b] = pages;
    if (!a || !b) throw Error("Missing pages");
    // Both nurses' screens hold evidence for the same scheduled dose.
    await documentDose(a, "painter-patient", "amoxicillin", "given");
    await documentDose(b, "painter-patient", "amoxicillin", "held");
    // Nurse B saves first.
    const response = await administer(b);
    expect(response?.status()).toBe(201);
    // Nurse A's evidence is stale: the service refuses it and the page
    // refreshes to the current dose (notifications are not streamed here).
    const commands: number[] = [];
    a.on("response", (r) => {
      if (
        r.url().endsWith("/commit/commands") &&
        r.request().method() === "POST"
      )
        commands.push(r.status());
    });
    const button = control(a, "w4Admin.commit.administerMed", "click");
    await reveal(a, button);
    await button.dblclick();
    await idle(a);
    await expect(a.locator("#status")).toContainText(/updated|refresh|Review/i);
    expect(commands.filter((s) => s === 201)).toHaveLength(0);
    const read = await chart(a, service.base, token, "painter-patient");
    expect(read.version).toBe(2);
    expect(read.administrations).toHaveLength(1);
    // After the refresh, a rapid double activation commits once.
    await openDose(a);
    await documentDose(a, "painter-patient", "amoxicillin", "given");
    const once = control(a, "w4Admin.commit.administerMed", "click");
    await reveal(a, once);
    await expect(once).toBeEnabled();
    commands.length = 0;
    await once.dblclick();
    await idle(a);
    // The second activation is refused once the chart has refreshed.
    await expect(a.locator("#status")).toContainText(
      /Administration saved|chart refreshed/,
    );
    expect(commands.filter((s) => s === 201)).toHaveLength(1);
    const after = await chart(a, service.base, token, "painter-patient");
    expect(after.administrations).toHaveLength(2);
  } finally {
    await first.close();
    await second.close();
    await service.close();
  }
});

test("MAR on /lean.html: a high-alert dose needs an independently authenticated cosign, and the urgent strip stays visible", async ({
  page,
}) => {
  const service = await startPainterService("P3");
  const token = service.tokens.P3 ?? "";
  try {
    const seen = await identity(page, "P3", service.base, token);
    await signIn(page, marUrl("painter-high", "high"), "P3", seen);
    await openDose(page);
    await documentDose(page, "painter-high", "insulin lispro", "given");
    // The urgent high-alert notice is pinned in the strip, inside the viewport.
    const urgent = page.locator('[data-role="alert"]').filter({
      has: page.locator("svg"),
    });
    await expect(urgent.first()).toBeVisible();
    const box = await urgent.first().boundingBox();
    const size = page.viewportSize();
    expect(box && size && box.y >= 0 && box.y + box.height <= size.height).toBe(
      true,
    );
    await fill(page, control(page, "w4Admin.highAlertCosign", "enter"), "RN2");
    // Without the second nurse's own authenticated consent: refused.
    const refused = await administer(page);
    expect(refused?.status()).toBe(422);
    expect(await refused?.text()).toContain("independent nurse");
    // The documenting nurse cannot consent for the cosigner.
    const version = (await chart(page, service.base, token, "painter-high"))
      .version;
    const cosign = (bearer: string) =>
      page.request.post(`${service.base}/mar/cosigns`, {
        headers: { Authorization: `Bearer ${bearer}` },
        data: {
          patient: "painter-high",
          release: "mar",
          workflow: "high",
          expectedVersion: version,
        },
      });
    expect((await cosign(token)).status()).toBe(201);
    const self = await administer(page);
    expect(self?.status()).toBe(422);
    // RN2 authenticates separately and cosigns this dose version.
    const consent = await cosign(service.tokens.RN2 ?? "");
    expect(consent.status(), await consent.text()).toBe(201);
    const accepted = await administer(page);
    expect(accepted?.status(), await accepted?.text()).toBe(201);
    const body = z
      .object({ mar: z.array(z.record(z.string(), z.unknown())) })
      .parse(await accepted?.json());
    expect(body.mar.filter((e) => "doubleCheckCosign" in e)).toHaveLength(1);
    expect(
      (await chart(page, service.base, token, "painter-high")).administrations,
    ).toHaveLength(1);
  } finally {
    await service.close();
  }
});
