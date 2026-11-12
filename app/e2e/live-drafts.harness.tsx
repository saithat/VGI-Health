// Test harness: the production live host and painter, current native Lean,
// and a real isolated commit service. Packaged WASM is deliberately untouched.
import { useLayoutEffect, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { createLiveSession } from "../src/core/liveSession";
import { UiScreenView } from "../src/ehr/ui/Screen";
import type { Interp } from "../src/core/interp";

function native(op: string, input: unknown): string {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/draft-native", false);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify({ op, input }));
  if (xhr.status !== 200) throw new Error(xhr.responseText);
  return xhr.responseText;
}
function call(
  op: string,
  spec: string,
  program: string,
  projection: string,
  user: string,
  state?: string,
  event?: string,
) {
  const p = JSON.parse(projection);
  return native(op, {
    spec: JSON.parse(spec),
    program: JSON.parse(program),
    facts: p.facts ?? p,
    display: p.display ?? {},
    user: JSON.parse(user),
    ...(state ? { state: JSON.parse(state) } : {}),
    ...(event ? { event: JSON.parse(event) } : {}),
  });
}
const interp: Interp = {
  init: (...args) => call("init", ...args),
  step: (...args) => call("step", ...args),
  view: (...args) => call("view", ...args),
  render: () => "{}",
  renderUi: (...args) => call("render-ui", ...args),
  facts: (input) => native("facts", JSON.parse(input)),
  screenCanonical: (input) => native("screen-canonical", JSON.parse(input)),
};
// Test-only fixture transport.
// eslint-disable-next-line boundary/single-data-module
const fixture = await (await fetch("/draft-fixture")).json();
const session = await createLiveSession(
  interp,
  fixture.spec,
  fixture.program,
  fixture.directory,
  {
    persona: "P1",
    role: "physician",
    practitioner: { resourceType: "Practitioner", id: "P1" },
  },
);
function Harness() {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useLayoutEffect(() => {
    if (snapshot.ui) session.onPaint(snapshot.ui);
  }, [snapshot]);
  if (!snapshot.ui) throw new Error("Missing native screen");
  return (
    <MantineProvider>
      <output id="result" />
      <UiScreenView
        screen={snapshot.ui}
        onEvent={(event) => {
          document.body.dataset.busy = "true";
          void session
            .dispatch(event)
            .then((result) => {
              resultElement().textContent = result?.message ?? "";
            })
            .catch((error) => {
              resultElement().textContent = String(error);
            })
            .finally(() => {
              document.body.dataset.busy = "false";
            });
        }}
      />
    </MantineProvider>
  );
}
function resultElement() {
  const result = document.getElementById("result");
  if (!result) throw new Error("Missing result element");
  return result;
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing test root");
createRoot(root).render(<Harness />);
