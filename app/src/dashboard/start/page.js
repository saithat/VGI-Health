/* global document, location, localStorage, XMLHttpRequest, URLSearchParams, setTimeout, addEventListener */
const element = (id) => document.getElementById(id);
const api = "/api/local-start/";
const personas = ["P1", "P2", "P3", "P4", "P5"];
const recordForm = element("record-form");
const fields = Object.fromEntries(
  [
    "runId",
    "days",
    "world",
    "screens",
    "backend",
    "model",
    "nightSearch",
    "nightProvider",
    "nightBaseUrl",
    "nightModel",
    "nightContextWindow",
    "reasoningEffort",
    "replayFrom",
  ].map((name) => [name, recordForm.elements.namedItem(name)]),
);
const personaBoxes = [...recordForm.querySelectorAll("[name=persona]")];
const resumeRun = element("resume-run");
const runSelect = element("view-run");
const personaSelect = element("view-persona");
const daySelect = element("view-day");
const versionSelect = element("view-version");
const launchButton = element("launch");
const stopButton = element("stop");

function readSettings(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? {};
  } catch {
    return {};
  }
}

function saveSettings(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Settings are optional in private browsing. */
  }
}

function request(path, body, csrf, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(body === undefined ? "GET" : "POST", path);
    req.responseType = "json";
    req.timeout = timeout;
    req.onload = () => {
      if (req.status >= 200 && req.status < 300 && req.response !== null)
        resolve(req.response);
      else
        reject(
          new Error(req.response?.error ?? `Request failed (${req.status})`),
        );
    };
    req.onerror = req.ontimeout = () =>
      reject(new Error("The local server is unavailable."));
    if (body !== undefined) {
      req.setRequestHeader("Content-Type", "application/json");
      req.setRequestHeader("X-VGI-CSRF", csrf);
    }
    req.send(body === undefined ? undefined : JSON.stringify(body));
  });
}

function options(select, choices, preferred) {
  select.replaceChildren(
    ...choices.map(([value, name]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = name;
      return option;
    }),
  );
  if (choices.some(([value]) => value === preferred)) select.value = preferred;
  select.disabled = choices.length === 0;
}

function updateLink(link, href) {
  if (href) {
    link.href = href;
    link.removeAttribute("aria-disabled");
  } else {
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
  }
}

function switchPanel() {
  const record = location.hash === "#record";
  element("view-panel").hidden = record;
  element("record-panel").hidden = !record;
  if (record) refreshOptions().catch(showFormError);
  for (const [name, active] of [
    ["view", !record],
    ["record", record],
  ]) {
    const link = element(name + "-nav");
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}
addEventListener("hashchange", switchPanel);

let runs = [];
let viewSequence = 0;
function viewLinks(run) {
  const query = new URLSearchParams({
    run: runSelect.value,
    persona: personaSelect.value,
    day: daySelect.value,
  });
  const version = versionSelect.value;
  const settings = {
    run: runSelect.value,
    persona: personaSelect.value,
    day: daySelect.value,
    version,
  };
  const ready = run?.replayable && settings.persona && settings.day;
  const trajectories = run?.files.includes("trajectories/index.json");
  if (version) query.set("version", version);
  updateLink(element("dashboard-link"), ready ? "/dashboard?" + query : "");
  query.delete("version");
  if (version) query.set("revision", version);
  query.set("view", "Trajectories");
  updateLink(
    element("replays-link"),
    ready && trajectories ? "/dashboard?" + query : "",
  );
  query.set("view", "compare");
  updateLink(
    element("compare-link"),
    ready && trajectories ? "/dashboard?" + query : "",
  );
  if (ready) {
    saveSettings("vgi.start.view", settings);
    element("view-status").textContent =
      `${run.days} completed ${run.days === 1 ? "day" : "days"}${trajectories ? "" : " · Task replays unavailable"}`;
  }
}

function versions(run, preferred) {
  const prefix = `programs/${personaSelect.value}/v`;
  const revisions =
    run?.files
      .filter((file) => file.startsWith(prefix))
      .map((file) => file.slice(prefix.length))
      .filter((file) => /^\d+\.json$/.test(file))
      .map((file) => Number(file.slice(0, -5)))
      .sort((a, b) => a - b) ?? [];
  options(
    versionSelect,
    [
      ["", "All versions"],
      ...revisions.map((number) => [String(number), `Version ${number}`]),
    ],
    preferred,
  );
  viewLinks(run);
}

async function loadViewRun(preferred) {
  const sequence = ++viewSequence;
  const run = runs.find((entry) => entry.id === runSelect.value);
  for (const select of [personaSelect, daySelect, versionSelect])
    options(select, []);
  viewLinks();
  if (!run) {
    element("view-status").textContent = "No recordings with a completed day.";
    return;
  }
  element("view-status").textContent = "Loading recording…";
  try {
    const manifest = await request(`/runs/${run.id}/manifest.json`);
    if (sequence !== viewSequence) return;
    options(
      personaSelect,
      manifest.personas.map((id) => [id, id]),
      preferred.persona ?? "P3",
    );
    options(
      daySelect,
      Array.from({ length: run.days }, (_, i) => [
        String(i + 1),
        `Day ${i + 1}`,
      ]),
      preferred.day ?? "1",
    );
    versions(run, preferred.version);
  } catch (error) {
    if (sequence === viewSequence)
      element("view-status").textContent = error.message;
  }
}

async function refreshViews() {
  const index = await request("/runs/index.json");
  const selection = index.length ? await request("/runs/default.json").catch(() => ({})) : {};
  const saved = readSettings("vgi.start.view");
  runs = index
    .filter((run) => run.replayable)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
    );
  options(
    runSelect,
    runs.map((run) => [run.id, run.id]),
    saved.run ?? selection.runId,
  );
  await loadViewRun(saved);
}

runSelect.addEventListener("change", () => {
  void loadViewRun(readSettings("vgi.start.view"));
});
personaSelect.addEventListener("change", () =>
  versions(runs.find((run) => run.id === runSelect.value)),
);
for (const select of [daySelect, versionSelect]) {
  select.addEventListener("change", () =>
    viewLinks(runs.find((run) => run.id === runSelect.value)),
  );
}

let downloading = false;
const sampleButton = element("sample-download");
sampleButton.addEventListener("click", async () => {
  if (!csrf || downloading) return;
  downloading = sampleButton.disabled = true;
  const status = element("sample-status");
  status.textContent = "Downloading and verifying the recording…";
  try {
    await request(api + "sample", {}, csrf, 0);
    await refreshViews();
    status.textContent = "Sample recording available.";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    downloading = false;
    sampleButton.disabled = !csrf;
  }
});

let configurations = { worlds: [], runs: [] };
let csrf;
let recording;
let recordingAvailable = false;
let pending = false;
let lastState;

function configuration() {
  return {
    ...Object.fromEntries(
      Object.entries(fields).map(([name, field]) => [name, field.value]),
    ),
    personas: personaBoxes.filter((box) => box.checked).map((box) => box.value),
    resume: Boolean(resumeRun.value),
  };
}

function setConfiguration(settings) {
  for (const [name, field] of Object.entries(fields))
    if (settings[name] !== undefined) {
      if (
        field.tagName !== "SELECT" ||
        [...field.options].some(
          (option) => option.value === String(settings[name]),
        )
      ) {
        field.value = settings[name];
      }
    }
  for (const box of personaBoxes)
    box.checked = (settings.personas ?? personas).includes(box.value);
  syncBackend();
}

async function refreshOptions() {
  configurations = await request(api + "options");
  const saved = readSettings("vgi.start.record");
  const values = recordingAvailable ? configuration() : saved;
  options(
    fields.world,
    configurations.worlds.map((world) => [
      world.id,
      `${world.id} · ${world.days} days`,
    ]),
    values.world ?? "2",
  );
  options(
    resumeRun,
    [
      ["", "Start a new run"],
      ...configurations.runs
        .filter((run) => run.backend)
        .map((run) => [run.id, run.id]),
    ],
    resumeRun.value,
  );
  options(
    fields.replayFrom,
    [
      ["", "Choose a recording"],
      ...configurations.runs.map((run) => [run.id, run.id]),
    ],
    values.replayFrom,
  );
  if (!recordingAvailable) setConfiguration(values);
  recordingAvailable = true;
  syncButtons();
}

function syncBackend() {
  const backend = fields.backend.value;
  const replay = backend === "replay";
  element("effort-field").hidden = backend !== "codex";
  element("replay-field").hidden = !replay;
  element("model-field").hidden = replay;
  element("night-provider-field").hidden = replay;
  const local = !replay && fields.nightProvider.value === "local";
  for (const [label, field] of [
    ["night-url-field", fields.nightBaseUrl], ["night-model-field", fields.nightModel],
    ["night-context-field", fields.nightContextWindow],
  ]) {
    element(label).hidden = field.disabled = !local;
    field.required = local;
  }
  fields.replayFrom.required = replay;
}

resumeRun.addEventListener("change", () => {
  const prior = configurations.runs.find((run) => run.id === resumeRun.value);
  fields.runId.readOnly = Boolean(prior);
  if (prior) setConfiguration({ ...prior, runId: prior.id });
  else fields.runId.value = "";
});

fields.replayFrom.addEventListener("change", () => {
  const prior = configurations.runs.find((run) => run.id === fields.replayFrom.value);
  if (prior) fields.nightSearch.value = prior.nightSearch ?? "first";
});
fields.nightProvider.addEventListener("change", syncBackend);
fields.backend.addEventListener("change", syncBackend);
recordForm.addEventListener("change", () => {
  const values = configuration();
  if (!values.resume) {
    delete values.runId;
    delete values.resume;
    saveSettings("vgi.start.record", values);
  }
});

function showFormError(error) {
  element("form-error").hidden = !error;
  element("form-error").textContent = error?.message ?? "";
}

function syncButtons() {
  const active = ["running", "stopping"].includes(recording?.state);
  launchButton.disabled =
    !recordingAvailable || !csrf || pending || active || !fields.world.value;
  stopButton.disabled = !csrf || pending || recording?.state !== "running";
}

function showRecording(next) {
  recording = next;
  syncButtons();
  if (!next) return;
  const { manifest, state, runId, error, log } = next;
  const title = state[0].toUpperCase() + state.slice(1);
  const days = manifest?.daysCompleted ?? 0;
  const total = manifest?.days;
  const info = total
    ? ` · ${days}/${total} days · ${manifest.nightsCompleted ?? 0} nights`
    : "";
  const status = `${runId} · ${title}${info}${error ? " · " + error : ""}`;
  if (element("recording-status").textContent !== status)
    element("recording-status").textContent = status;
  const progress = element("recording-progress");
  progress.hidden = !total;
  if (total) {
    progress.max = total;
    progress.value = days;
  }
  const output = element("log");
  if (output.textContent !== log) {
    const atEnd =
      output.scrollHeight - output.clientHeight - output.scrollTop < 20;
    output.textContent = log;
    output.hidden = !log;
    if (atEnd) output.scrollTop = output.scrollHeight;
  }
  const open = element("open-recording");
  open.hidden = days < 1;
  if (days > 0) open.href = `/dashboard?run=${runId}`;
  if (lastState !== state) {
    lastState = state;
    if (["completed", "failed", "stopped"].includes(state)) {
      refreshOptions().catch(showFormError);
      refreshViews().catch((error) => {
        element("view-status").textContent = error.message;
      });
    }
  }
}

function showStack(stack, date) {
  const badge = element("stack-badge");
  const labels = {
    starting: "EHR starting",
    running: "EHR running",
    "docker-missing": "Docker unavailable",
    unavailable: "EHR unavailable",
  };
  const label = labels[stack.state] ?? "EHR unavailable";
  if (badge.textContent !== label) badge.textContent = label;
  badge.dataset.state = stack.state;
  const detail = element("stack-explanation");
  if (detail.textContent !== stack.message) detail.textContent = stack.message;
  for (const link of document.querySelectorAll("[data-live]")) {
    const href = link.dataset.live;
    const dated = date ? href + (href.includes("?") ? "&" : "?") + "date=" + encodeURIComponent(date) : href;
    updateLink(link, stack.state === "running" ? dated : "");
  }
}

let pollGeneration = 0;
async function poll() {
  const generation = ++pollGeneration;
  try {
    const status = await request(api + "status");
    if (generation !== pollGeneration) return;
    csrf = status.csrf;
    element("data-source").textContent = status.dataSource;
    sampleButton.disabled = downloading;
    showStack(status.stack, status.clinicalDate);
    element("memory").textContent = status.capped
      ? "24 GB memory limit"
      : "No memory cap · systemd user scopes unavailable";
    if (!pending) showRecording(status.recording);
  } catch (error) {
    if (generation !== pollGeneration) return;
    csrf = undefined;
    sampleButton.disabled = true;
    showStack({ state: "unavailable", message: error.message });
    syncButtons();
  } finally {
    if (generation === pollGeneration)
      setTimeout(poll, recording?.state === "running" ? 1000 : 2500);
  }
}

async function mutate(path, body) {
  if (!csrf || pending) return;
  pending = true;
  syncButtons();
  showFormError(null);
  try {
    const result = await request(api + path, body, csrf);
    showRecording(result.recording);
  } catch (error) {
    showFormError(error);
  } finally {
    pending = false;
    syncButtons();
  }
}

recordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void mutate("launch", configuration());
});
stopButton.addEventListener("click", () => {
  void mutate("stop", {});
});
switchPanel();
refreshViews().catch((error) => {
  element("view-status").textContent = error.message;
});
void poll();
