import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Modal,
  NativeSelect,
  NumberInput,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { Fragment, type ReactNode } from "react";
import {
  assertNever,
  renderKind,
  type ElementSpec,
  type Event,
  type ItemView,
  type ScreenView,
  type Spec,
  type Value,
} from "../core/types";
import type { ChartData } from "../data/fhir";
import { InfoRenderer } from "./InfoRenderer";
import { PatientBanner } from "./PatientBanner";

export interface RenderContext {
  data: ChartData;
  spec: Spec;
  valueSets: Readonly<
    Record<string, readonly { value: string; label: string }[]>
  >;
  onEvent: (event: Event) => void;
}
interface ItemProps extends RenderContext {
  item: ItemView;
  view: ScreenView;
}

function valueText(value: Value | undefined): string {
  if (!value) return "";
  if ("text" in value) return value.text.s;
  if ("code" in value) return value.code.c;
  if ("user" in value) return value.user.u;
  if ("qty" in value) return String(value.qty.tenths / 10);
  if ("flag" in value) return String(value.flag.b);
  return assertNever(value);
}

function FieldControl({
  element,
  item,
  disabled,
  valueSets,
  onEvent,
}: {
  element: ElementSpec;
  item: ItemView;
  disabled: boolean;
  valueSets: RenderContext["valueSets"];
  onEvent: RenderContext["onEvent"];
}) {
  const kind = element.kind;
  const value = item.bound?.value;
  const label = item.component.label || element.label;
  const send = (next: Value) =>
    onEvent({ enter: { comp: item.component.id, value: next } });
  const common = {
    label,
    disabled,
    size: "xs" as const,
    id: `field-${item.component.id}`,
  };
  if (typeof kind === "object") {
    if ("quantity" in kind)
      return (
        <NumberInput
          {...common}
          value={valueText(value)}
          min={0}
          decimalScale={1}
          suffix={kind.quantity.unit === "none" ? "" : ` ${kind.quantity.unit}`}
          onChange={(next) => {
            const numeric = typeof next === "number" ? next : Number(next);
            if (next !== "" && Number.isFinite(numeric) && numeric >= 0)
              send({
                qty: {
                  tenths: Math.round(numeric * 10),
                  unit: kind.quantity.unit,
                },
              });
          }}
        />
      );
    if ("coded" in kind) {
      const options = valueSets[kind.coded.valueSet] ?? [];
      return (
        <NativeSelect
          {...common}
          value={valueText(value)}
          data={[{ value: "", label: "Select…" }, ...options]}
          onChange={(event) => send({ code: { c: event.currentTarget.value } })}
        />
      );
    }
    if ("scan" in kind)
      return (
        <TextInput
          {...common}
          placeholder={`Scan ${kind.scan.target} barcode`}
          autoComplete="off"
          onChange={(event) => send({ text: { s: event.currentTarget.value } })}
          value={valueText(value)}
          leftSection={<span aria-hidden="true">▥</span>}
        />
      );
    return assertNever(kind);
  }
  switch (kind) {
    case "text":
      return (
        <Textarea
          {...common}
          autosize
          minRows={2}
          maxRows={8}
          value={valueText(value)}
          onChange={(event) => send({ text: { s: event.currentTarget.value } })}
        />
      );
    case "flag":
      return (
        <Checkbox
          {...common}
          checked={value && "flag" in value ? value.flag.b : false}
          onChange={(event) =>
            send({ flag: { b: event.currentTarget.checked } })
          }
        />
      );
    case "identity":
      return (
        <TextInput
          {...common}
          placeholder="Initials / sex / age"
          autoComplete="off"
          value={valueText(value)}
          onChange={(event) => send({ text: { s: event.currentTarget.value } })}
          description="Re-enter the patient identifiers. The interpreter validates the match."
        />
      );
    case "cosign":
      return (
        <TextInput
          {...common}
          placeholder="Second clinician user ID"
          autoComplete="off"
          value={valueText(value)}
          onChange={(event) => send({ user: { u: event.currentTarget.value } })}
          description="Independent second-clinician check"
        />
      );
    default:
      return assertNever(kind);
  }
}

function WithReason({
  disabled,
  reason,
  children,
}: {
  disabled: boolean;
  reason: string | undefined;
  children: ReactNode;
}) {
  if (!disabled) return children;
  return (
    <Tooltip
      label={reason ?? "Unavailable in this interpreter state"}
      multiline
      maw={340}
      withArrow
    >
      <span
        className="disabled-target"
        tabIndex={0}
        aria-label={reason ?? "Unavailable in this interpreter state"}
      >
        {children}
      </span>
    </Tooltip>
  );
}

/** Exhaustive dispatch over the catalog, with no state or data effects. */
export function RenderItem(props: ItemProps): ReactNode {
  const { item, view, data, spec, valueSets, onEvent } = props;
  const comp = item.component;
  const kind = renderKind(comp.kind);
  const enabled = view.enabled.includes(comp.id);
  const reason = view.blocked.find(([id]) => id === comp.id)?.[1];
  const click = () => onEvent({ click: { comp: comp.id } });
  switch (kind.tag) {
    case "banner":
      return <PatientBanner data={data} />;
    case "field": {
      const element = spec.elements.find((entry) => entry.id === kind.element);
      if (!element)
        return (
          <Alert color="red">
            Missing element specification: {kind.element}
          </Alert>
        );
      const humanOnly =
        element.humanOnly ||
        element.kind === "identity" ||
        element.kind === "cosign" ||
        (typeof element.kind === "object" && "scan" in element.kind);
      return (
        <>
          <FieldControl
            element={element}
            item={item}
            disabled={!enabled}
            valueSets={valueSets}
            onEvent={onEvent}
          />
          {humanOnly && (
            <Badge
              className="human-only"
              size="xs"
              color="orange"
              variant="light"
            >
              Human only · unskippable
            </Badge>
          )}
          {(item.bound?.provenance || item.bound?.pendingConfirm) && (
            <div className="provenance">
              <Badge color="gray" variant="light" size="xs">
                Source: {item.bound.provenance ?? "Not supplied by interpreter"}
              </Badge>
              {item.bound.pendingConfirm && (
                <WithReason disabled={!enabled} reason={reason}>
                  <Button
                    size="compact-xs"
                    variant="light"
                    disabled={!enabled}
                    onClick={() => onEvent({ confirm: { comp: comp.id } })}
                  >
                    Confirm
                  </Button>
                </WithReason>
              )}
              {!item.bound.pendingConfirm && <span>Confirmed</span>}
            </div>
          )}
        </>
      );
    }
    case "panel":
    case "table":
    case "trend":
      return (
        <section data-info-id={kind.info}>
          <h3 className="section-label">{comp.label}</h3>
          <InfoRenderer info={kind.info} data={data} />
        </section>
      );
    case "alert": {
      const content = (
        <Alert color="orange" variant="light" title={comp.label || kind.alert}>
          <span>
            {spec.alerts.find((alert) => alert.id === kind.alert)?.label ??
              "Interpreter-provided advisory"}
          </span>
        </Alert>
      );
      if (!kind.popup) return content;
      return (
        <>
          <span className="subtle">{comp.label}</span>
          <Modal
            opened={view.popup?.[0] === kind.alert}
            title={comp.label}
            onClose={() => {
              /* Only an explicit interpreter ack closes a safety popup. */
            }}
            withCloseButton={false}
            closeOnClickOutside={false}
            closeOnEscape={false}
            centered
          >
            {content}
            <Badge mt="sm" color="orange">
              Human only · unskippable
            </Badge>
            <WithReason disabled={!enabled} reason={reason}>
              <Button
                mt="md"
                fullWidth
                disabled={!enabled}
                onClick={() => onEvent({ ack: { alert: kind.alert } })}
              >
                Acknowledge
              </Button>
            </WithReason>
          </Modal>
        </>
      );
    }
    case "button":
      return (
        <>
          <WithReason disabled={!enabled} reason={reason}>
            <Button
              size="compact-sm"
              variant={
                typeof kind.action === "object" && "commit" in kind.action
                  ? "filled"
                  : "default"
              }
              disabled={!enabled}
              onClick={click}
              title={comp.hotkey ?? undefined}
            >
              {comp.label}
            </Button>
          </WithReason>
          {typeof kind.action === "object" && "commit" in kind.action && (
            <Badge
              className="human-only"
              size="xs"
              color="orange"
              variant="light"
            >
              Human only · unskippable
            </Badge>
          )}
        </>
      );
    case "group":
      return (
        <div className="group-header">
          {kind.collapsible ? (
            <WithReason disabled={!enabled} reason={reason}>
              <Button
                variant="subtle"
                size="compact-sm"
                color="dark"
                disabled={!enabled}
                onClick={click}
                aria-expanded={item.expanded}
              >
                {item.expanded ? "▾" : "▸"} {comp.label}
              </Button>
            </WithReason>
          ) : (
            <h3>{comp.label}</h3>
          )}
          <span>
            {kind.collapsible
              ? item.expanded
                ? "Expanded"
                : "Collapsed"
              : "Encounter section"}
          </span>
        </div>
      );
    case "tabs": {
      const children = view.items.filter(
        (child) => child.component.parent === comp.id,
      );
      const indexes = [
        ...new Set(children.map((child) => child.component.tab)),
      ];
      return (
        <div role="tablist" aria-label={comp.label} className="workflow-tabs">
          {indexes.map((idx) => (
            <WithReason key={idx} disabled={!enabled} reason={reason}>
              <button
                type="button"
                role="tab"
                aria-selected={idx === item.selectedTab}
                disabled={!enabled}
                onClick={() => onEvent({ selectTab: { comp: comp.id, idx } })}
              >
                {children.find((child) => child.component.tab === idx)
                  ?.component.label ?? `Section ${idx + 1}`}
              </button>
            </WithReason>
          ))}
        </div>
      );
    }
    case "macro":
      return (
        <WithReason disabled={!enabled} reason={reason}>
          <Button
            size="compact-sm"
            variant="light"
            color="teal"
            disabled={!enabled}
            onClick={click}
          >
            ▦ {comp.label}
          </Button>
        </WithReason>
      );
    case "search":
      return (
        <form
          className="catalog-search"
          onSubmit={(event) => {
            event.preventDefault();
            const query = new FormData(event.currentTarget).get("query");
            if (typeof query === "string") onEvent({ search: { query } });
          }}
        >
          <TextInput
            name="query"
            size="xs"
            aria-label={comp.label}
            placeholder={`${comp.label} · ${kind.scope}`}
            disabled={!enabled}
          />
          <WithReason disabled={!enabled} reason={reason}>
            <Button type="submit" size="compact-sm" disabled={!enabled}>
              Search
            </Button>
          </WithReason>
        </form>
      );
    default:
      return assertNever(kind);
  }
}

export function ScreenRenderer({
  view,
  ...context
}: RenderContext & { view: ScreenView }) {
  // shown is the sole visibility gate. Never recalculate receipts, ancestor
  // expansion, tabs, sizes, alert conditions, or safety policy in React.
  const shown = view.items.filter((item) => item.shown);
  function paint(item: ItemView) {
    const tag = renderKind(item.component.kind).tag;
    return (
      <div
        key={item.component.id}
        data-comp-id={item.component.id}
        data-kind={tag}
        data-depth={item.depth}
        data-size={item.component.size}
        className={`render-item kind-${tag}`}
        style={{ paddingInlineStart: item.depth * 3 }}
      >
        <RenderItem {...context} view={view} item={item} />
      </div>
    );
  }
  // Group adjacent layout regions, preserving the interpreter's list order.
  const regions: {
    mode: "banner" | "activity" | "content";
    items: ItemView[];
  }[] = [];
  for (const item of shown) {
    const mode =
      item.component.kind === "banner"
        ? "banner"
        : item.component.tag.startsWith("activity-")
          ? "activity"
          : "content";
    const previous = regions.at(-1);
    if (previous?.mode === mode) previous.items.push(item);
    else regions.push({ mode, items: [item] });
  }
  const headingIndex = regions.findIndex((region) => region.mode === "content");
  return (
    <div className="screen-renderer">
      {regions.map((region, index) => (
        <Fragment key={index}>
          {index === headingIndex && (
            <div className="screen-heading">
              <div>
                <span className="eyebrow">ACTIVE ENCOUNTER</span>
                <h2>{view.title}</h2>
              </div>
              <span className="subtle">{view.screen} · interpreter view</span>
            </div>
          )}
          {region.mode === "banner" ? (
            region.items.map(paint)
          ) : region.mode === "activity" ? (
            <nav aria-label="Chart activities" className="activity-tabs">
              {region.items.map(paint)}
            </nav>
          ) : (
            <div className="screen-items">{region.items.map(paint)}</div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
