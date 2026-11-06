import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MantineProvider } from "@mantine/core";
import type { PresentationBundle } from "../ehr/ui/presentation-types";
import type { UiScreen } from "../ehr/ui/types";
import { UiScreenView } from "../ehr/ui/Screen";
import { clinicalTheme } from "../ehr/ui/theme";
import {
  eventTarget,
  entryText,
  type TrajectoryEvent,
} from "./trajectory-replay";

export const REPLAY_VIEWPORT = { width: 1440, height: 900 };

function targetNode(doc: Document, event: TrajectoryEvent | undefined) {
  const id = eventTarget(event?.event);
  if (!id) return null;
  const nodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-comp-id]"));
  return (
    nodes.find(
      (node) =>
        node.dataset.compId === id &&
        node.getClientRects().length &&
        !node.closest('[inert], [aria-hidden="true"]'),
    ) ??
    (event && "ack" in event.event
      ? doc.querySelector<HTMLElement>('[role="dialog"] button')
      : null)
  );
}

function scrollers(doc: Document) {
  const root = doc.scrollingElement;
  return [
    ...(root instanceof HTMLElement ? [root] : []),
    ...Array.from(doc.querySelectorAll<HTMLElement>("body *")).filter(
      (node) =>
        node.scrollHeight > node.clientHeight + 1 &&
        /auto|scroll/.test(getComputedStyle(node).overflowY),
    ),
  ];
}

// Scroll only inside the recording. Element.scrollIntoView can also scroll the
// dashboard that contains the iframe, moving the transport under the pointer.
function reveal(doc: Document, node: HTMLElement) {
  const root = doc.scrollingElement;
  for (const container of scrollers(doc).reverse()) {
    if (!container.contains(node)) continue;
    const rect = node.getBoundingClientRect();
    const bounds =
      container === root
        ? { top: 120, bottom: 900 }
        : container.getBoundingClientRect();
    if (rect.top < bounds.top || rect.bottom > bounds.bottom)
      container.scrollTop +=
        rect.top - bounds.top - (bounds.bottom - bounds.top - rect.height) / 2;
  }
}

export type TrajectoryFrameState = {
  presentations: PresentationBundle | null;
  screen: UiScreen;
  trace: TrajectoryEvent[];
  count: number;
  speed: number;
  title: string;
};

export function TrajectoryFrame({
  presentations,
  screen,
  trace,
  count,
  speed,
  title,
}: TrajectoryFrameState) {
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setScale(
          Math.min(
            entry.contentRect.width / 1440,
            entry.contentRect.height / 900,
          ),
        );
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.source === frame.current?.contentWindow &&
        event.origin === location.origin &&
        event.data === "trajectory-ready"
      )
        setReady(true);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (ready)
      frame.current?.contentWindow?.postMessage(
        {
          type: "trajectory-state",
          presentations,
          screen,
          trace,
          count,
          speed,
          title,
        },
        location.origin,
      );
  }, [ready, presentations, screen, trace, count, speed, title]);
  return (
    <div
      ref={stage}
      className="trajectory-stage"
      aria-label={`${title} viewport`}
    >
      <iframe
        ref={frame}
        title={title}
        className="trajectory-frame"
        width={1440}
        height={900}
        tabIndex={-1}
        style={{
          transform: `scale(${scale})`,
          left: `calc(50% - ${720 * scale}px)`,
          top: `calc(50% - ${450 * scale}px)`,
        }}
        src="/trajectory-frame.html"
      />
    </div>
  );
}

// This surface runs in the iframe's own JavaScript realm, so painter window,
// media-query, modal and scroll effects all use the fixed logical viewport.
export function TrajectorySurface({
  presentations,
  screen,
  trace,
  count,
  speed,
}: TrajectoryFrameState) {
  const doc = document;
  const [shown, setShown] = useState({ screen, count });
  const current = useRef(shown);
  const seek = useRef(true);
  const deferredScroll = useRef<number | null>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const ripple = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 720, y: 450 });

  useLayoutEffect(() => {
    doc.documentElement.dataset.replayCount = String(shown.count);
    // The painter stays read-only; changing these DOM values during an animation
    // is visual only. The interpreter remains the sole source of clinical state.
    for (const control of doc.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [role="tab"]',
    )) {
      control.setAttribute("disabled", "");
      control.setAttribute("aria-disabled", "true");
      control.title =
        "Recorded replay; use the playback controls outside this EHR";
    }
    const next = trace
      .slice(shown.count)
      .find((entry) => eventTarget(entry.event));
    const id = eventTarget(next?.event);
    doc
      .querySelectorAll<HTMLElement>('[data-trajectory-highlight="true"]')
      .forEach((node) => {
        delete node.dataset.trajectoryHighlight;
      });
    doc.querySelectorAll<HTMLElement>("[data-comp-id]").forEach((node) => {
      node.dataset.trajectoryHighlight = String(node.dataset.compId === id);
    });
    const nextTarget = targetNode(doc, next);
    if (nextTarget) nextTarget.dataset.trajectoryHighlight = "true";
  }, [doc, shown, trace]);

  useEffect(() => {
    if (!doc) return;
    let animation = 0;
    let cancelled = false;
    let restoreInput: (() => void) | undefined;
    const previous = current.current;
    const sequential = count === previous.count + 1;
    const event = trace[count - 1];
    deferredScroll.current = null;
    seek.current = !sequential;
    const finish = () => {
      restoreInput?.();
      current.current = { screen, count };
      setShown({ screen, count });
    };
    if (!sequential || !event) {
      finish();
      return;
    }
    const start = performance.now();
    const duration = 640 / speed;
    const node = targetNode(doc, event);
    const containers = scrollers(doc);
    const before = containers.map((container) => container.scrollTop);
    if ("scroll" in event.event) {
      // Compact traces encode page-downs, not raw browser offsets. Use the same
      // first scroll container / one viewport rule as the geometry cost model.
      if (previous.screen.screen !== event.screen) {
        // Facts can arrive between recorded events. The scroll then belongs to
        // the incoming chart, while the DOM still contains its loading screen.
        deferredScroll.current = count;
      } else {
        const container = containers.find(
          (item) => item.scrollHeight > item.clientHeight + 1,
        );
        if (container) container.scrollTop += container.clientHeight;
      }
    } else if (node) reveal(doc, node);
    const after = containers.map((container) => container.scrollTop);
    containers.forEach((container, index) => {
      container.scrollTop = before[index] ?? 0;
    });
    const from = { ...pointer.current };
    const text = entryText(event.event);
    const input =
      node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement
        ? node
        : node?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
            "input:not([type=hidden]), textarea",
          );
    if (input && text !== null) {
      const value = input.value;
      restoreInput = () => {
        input.value = value;
      };
    }
    let clicked = false;
    const tick = (now: number) => {
      if (cancelled) return;
      const progress = Math.min(1, (now - start) / duration);
      const move = 1 - Math.pow(1 - Math.min(1, progress / 0.55), 3);
      containers.forEach((container, index) => {
        container.scrollTop =
          (before[index] ?? 0) +
          ((after[index] ?? 0) - (before[index] ?? 0)) * move;
      });
      if (node) {
        const rect = node.getBoundingClientRect();
        const destination = {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        };
        pointer.current = {
          x: from.x + (destination.x - from.x) * move,
          y: from.y + (destination.y - from.y) * move,
        };
        if (cursor.current) {
          cursor.current.style.transform = `translate(${pointer.current.x}px, ${pointer.current.y}px)`;
          cursor.current.style.opacity = "1";
        }
        if (
          progress >= 0.55 &&
          !clicked &&
          event.ops.includes("click") &&
          ripple.current
        ) {
          clicked = true;
          ripple.current.style.left = `${destination.x}px`;
          ripple.current.style.top = `${destination.y}px`;
          ripple.current.animate(
            [
              { opacity: 0.9, transform: "translate(-50%, -50%) scale(.3)" },
              { opacity: 0, transform: "translate(-50%, -50%) scale(2.5)" },
            ],
            { duration: 400 / speed },
          );
        }
      }
      if (input && text !== null)
        input.value = text.slice(
          0,
          Math.ceil(text.length * Math.max(0, (progress - 0.45) / 0.55)),
        );
      if (progress < 1) animation = requestAnimationFrame(tick);
      else finish();
    };
    animation = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
      restoreInput?.();
    };
  }, [doc, count, screen, trace, speed]);

  useLayoutEffect(() => {
    if (!doc) return;
    const event = trace[shown.count - 1];
    const activeScreen = shown.screen.screen ?? trace[shown.count]?.screen;
    const navigated = event?.screen !== activeScreen;
    if (navigated || shown.count === 0) {
      scrollers(doc).forEach((container) => {
        container.scrollTop = 0;
      });
    }
    if (deferredScroll.current === shown.count) {
      const container = scrollers(doc).find(
        (item) => item.scrollHeight > item.clientHeight + 1,
      );
      if (container) container.scrollTop += container.clientHeight;
      deferredScroll.current = null;
    }
    if (seek.current) {
      const containers = scrollers(doc);
      containers.forEach((container) => {
        container.scrollTop = 0;
      });
      let start = shown.count;
      while (start > 0 && trace[start - 1]?.screen === activeScreen) start--;
      for (const entry of trace.slice(start, shown.count)) {
        if ("scroll" in entry.event) {
          const container = containers.find(
            (item) => item.scrollHeight > item.clientHeight + 1,
          );
          if (container) container.scrollTop += container.clientHeight;
        } else {
          const node = targetNode(doc, entry);
          if (node) reveal(doc, node);
        }
      }
      const node = targetNode(doc, trace[shown.count - 1]);
      if (node && !navigated) {
        const rect = node.getBoundingClientRect();
        pointer.current = {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        };
      } else if (shown.count === 0) pointer.current = { x: 720, y: 450 };
      if (cursor.current) {
        cursor.current.style.transform = `translate(${pointer.current.x}px, ${pointer.current.y}px)`;
        cursor.current.style.opacity = shown.count ? "1" : "0";
      }
      seek.current = false;
    }
  }, [doc, shown, trace]);

  return (
    <>
      <MantineProvider
        theme={{
          ...clinicalTheme,
          components: {
            ...clinicalTheme.components,
            ModalRoot: { defaultProps: { portalProps: { target: doc.body } } },
          },
        }}
      >
        <UiScreenView
          screen={shown.screen}
          onEvent={() => {}}
          presentations={presentations}
        />
      </MantineProvider>
      <div ref={cursor} className="trajectory-cursor" aria-hidden="true">
        <svg viewBox="0 0 24 30">
          <path
            d="M2 2v23l6-6 5 10 5-3-5-9h9Z"
            fill="#153c49"
            stroke="white"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div ref={ripple} className="trajectory-ripple" aria-hidden="true" />
    </>
  );
}
