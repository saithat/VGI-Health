import { useId, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Kbd,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import type { Event } from "../../../../lean/generated/ehr-types";
import { entryEvent } from "./events";
import type { NodeOf, UiNode } from "./types";

export type Emit = (event: Event) => void;
type Props<K extends ParametersKey> = { node: NodeOf<K>; onEvent: Emit };
type ParametersKey =
  | "section"
  | "columns"
  | "tabs"
  | "stepper"
  | "field"
  | "info"
  | "alert"
  | "button"
  | "text";
export function UiChildren({
  nodes,
  onEvent,
}: {
  nodes: UiNode[];
  onEvent: Emit;
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <UiNodeView
          key={i}
          node={node}
          onEvent={onEvent}
          confirmProvided={
            "field" in node &&
            nodes.some(
              (other) =>
                "button" in other &&
                other.button.role === "confirm" &&
                other.button.comp === node.field.comp,
            )
          }
        />
      ))}
    </>
  );
}
export function SectionNode({ node, onEvent }: Props<"section">) {
  return (
    <Paper
      component="section"
      data-section-id={node.id}
      role="region"
      aria-label={node.title}
      withBorder
      className="clinical-section"
    >
      <div className="clinical-section-title">
        <h2>{node.title}</h2>
      </div>
      <Stack gap="sm" className="clinical-section-body">
        <UiChildren nodes={node.children} onEvent={onEvent} />
      </Stack>
    </Paper>
  );
}
export function ColumnsNode({ node, onEvent }: Props<"columns">) {
  return (
    <SimpleGrid
      cols={{ base: 1, md: Math.min(3, Math.max(1, node.children.length)) }}
      spacing="sm"
      className="clinical-columns"
    >
      <UiChildren nodes={node.children} onEvent={onEvent} />
    </SimpleGrid>
  );
}
export function TabsNode({ node, onEvent }: Props<"tabs">) {
  return (
    <Tabs
      value={String(node.selected)}
      onChange={(value) => {
        if (value !== null)
          onEvent({ selectTab: { comp: node.id, idx: Number(value) } });
      }}
      className="clinical-tabs"
    >
      <Tabs.List aria-label="Chart tabs">
        {node.labels.map((label, index) => (
          <Tabs.Tab key={index} value={String(index)}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel value={String(node.selected)} pt="sm">
        <UiChildren nodes={node.body} onEvent={onEvent} />
      </Tabs.Panel>
    </Tabs>
  );
}
export function StepperNode({ node }: Props<"stepper">) {
  // Screen ids are navigation destinations, not component ids. Only Lean's nav
  // buttons dispatch clicks; this overview must not invent a click component.
  return (
    <ol aria-label="Visit progress" className="clinical-stepper">
      {node.steps.map(([id, label], index) => (
        <li
          key={id}
          aria-current={index === node.current ? "step" : undefined}
          className={
            index < node.current
              ? "complete"
              : index === node.current
                ? "current"
                : ""
          }
        >
          <span className="step-number" aria-hidden="true">
            {index + 1}
          </span>
          <Tooltip label={label} withArrow>
            <span className="step-label" title={label} tabIndex={0}>
              {label}
            </span>
          </Tooltip>
        </li>
      ))}
    </ol>
  );
}
export function FieldNode({
  node,
  onEvent,
  confirmProvided = false,
}: Props<"field"> & { confirmProvided?: boolean }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const send = (value: string | number | boolean) => {
    const event = entryEvent(node, value);
    if (event) onEvent(event);
  };
  const kind = node.kind.split(":")[0];
  const special =
    kind === "user" || kind === "cosign"
      ? "cosign"
      : kind === "identity" ||
          /identity|re[- ]?enter|re[- ]?entry/i.test(node.label)
        ? "identity"
        : kind === "scan" || /scan|barcode/i.test(node.label)
          ? "scan"
          : undefined;
  const common = {
    label: node.label,
    "aria-label": node.label,
    required: node.required,
    size: "xs" as const,
    "data-comp-id": node.comp,
    "data-event": "enter",
    className: "clinical-control",
  };
  const options = node.kind
    .split(":")
    .slice(1)
    .join(":")
    .split("|")
    .filter(Boolean);
  const codes = Array.from(
    new Set([...(node.value ? [node.value] : []), ...options]),
  );
  return (
    <Box
      className={`clinical-field${node.pendingConfirm ? " pending" : ""}${special ? ` field-${special}` : ""}`}
    >
      <Group
        gap={6}
        justify="space-between"
        wrap="wrap"
        mb={node.humanOnly || special ? 5 : 0}
      >
        {special && (
          <Text size="xs" fw={600} c="dimmed">
            {special === "identity"
              ? "Verify patient identity"
              : special === "scan"
                ? "Barcode verification"
                : "Second clinician verification"}
          </Text>
        )}
        {node.humanOnly && (
          <Badge
            className="human-lock"
            size="sm"
            variant="light"
            color="gray"
            leftSection={
              <svg
                aria-hidden="true"
                width="11"
                height="12"
                viewBox="0 0 12 14"
                fill="none"
              >
                <rect
                  x="1.5"
                  y="6"
                  width="9"
                  height="6.5"
                  rx="1.5"
                  stroke="currentColor"
                />
                <path
                  d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2M6 8.5v2"
                  stroke="currentColor"
                />
              </svg>
            }
          >
            Human entry only
          </Badge>
        )}
      </Group>
      {kind === "flag" ? (
        <Checkbox
          {...common}
          checked={node.value === "true"}
          onChange={(e) => send(e.currentTarget.checked)}
        />
      ) : ["quantity", "qty", "number"].includes(kind ?? "") ? (
        <NumberInput
          {...common}
          value={node.value ?? ""}
          onChange={send}
          decimalScale={1}
          min={0}
          hideControls
          inputMode="decimal"
          rightSection={
            node.unit && node.unit !== "none" ? (
              <Text size="xs" c="dimmed">
                {node.unit}
              </Text>
            ) : null
          }
          rightSectionWidth={58}
        />
      ) : kind === "coded" || kind === "code" ? (
        <Select
          {...common}
          role="combobox"
          aria-expanded={dropdownOpen}
          onDropdownOpen={() => setDropdownOpen(true)}
          onDropdownClose={() => setDropdownOpen(false)}
          rightSection={<span aria-hidden="true">⌄</span>}
          searchable
          data={codes}
          value={node.value}
          placeholder="Select or search code"
          onChange={(value) => send(value ?? "")}
          onInput={(event) => {
            // Select's onSearchChange also fires when it synchronizes a supplied
            // value. Only a real input event may turn a code into human entry.
            if (options.length === 0) send(event.currentTarget.value);
          }}
          nothingFoundMessage="Enter a code"
        />
      ) : (
        <TextInput
          {...common}
          value={node.value ?? ""}
          onChange={(e) => send(e.currentTarget.value)}
          autoComplete="off"
          placeholder={
            kind === "search"
              ? "Search the patient chart"
              : special === "identity"
                ? "Re-enter patient identifiers"
                : special === "scan"
                  ? "Scan or enter barcode"
                  : special === "cosign"
                    ? "Enter clinician ID"
                    : "Enter value"
          }
          leftSection={
            special === "scan" ? <span aria-hidden="true">▥</span> : undefined
          }
        />
      )}
      {(node.provenance || node.pendingConfirm) && (
        <Group gap={6} mt={6} wrap="wrap">
          {node.provenance && (
            <Badge
              variant="light"
              color="gray"
              size="sm"
              className="provenance-chip"
            >
              {node.provenance}
            </Badge>
          )}
          {node.pendingConfirm && !confirmProvided && (
            <Button
              size="compact-xs"
              variant="light"
              color="yellow"
              aria-label={`Confirm ${node.label}`}
              data-comp-id={node.comp}
              data-event="confirm"
              onClick={() => onEvent({ confirm: { comp: node.comp } })}
            >
              Confirm
            </Button>
          )}
        </Group>
      )}
    </Box>
  );
}
function InfoTable({ node }: { node: NodeOf<"info"> }) {
  const headers = Array.from(
    new Set(
      node.rows.length
        ? node.rows.flatMap((row) => row.map(([key]) => key))
        : ["Record"],
    ),
  );
  return (
    <div className="clinical-table-scroll">
      <Table
        striped
        highlightOnHover
        stickyHeader
        withColumnBorders={false}
        aria-label={node.label}
        fz="xs"
        verticalSpacing={6}
        horizontalSpacing="sm"
      >
        <Table.Thead>
          <Table.Tr>
            {headers.map((header) => (
              <Table.Th key={header} scope="col">
                {header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {node.rows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={headers.length}>No records on file</Table.Td>
            </Table.Tr>
          )}
          {node.rows.map((row, index) => (
            <Table.Tr key={index}>
              {headers.map((header) => (
                <Table.Td key={header}>
                  {row.find(([key]) => key === header)?.[1] ?? "—"}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}
export function InfoNode({ node }: Props<"info">) {
  const values = node.rows
    .flatMap((row) =>
      row
        .filter(([key]) => /value|result|weight/i.test(key))
        .map(([, value]) => Number.parseFloat(value)),
    )
    .filter(Number.isFinite);
  const low = Math.min(...values),
    range = Math.max(...values) - low || 1;
  const points = values
    .map(
      (value, index) =>
        `${10 + (index * 280) / Math.max(1, values.length - 1)},${62 - ((value - low) * 48) / range}`,
    )
    .join(" ");
  return (
    <div
      className={`clinical-info info-${node.display}`}
      data-comp-id={node.comp || undefined}
      data-info-id={node.infoId}
    >
      <Text component="h3" className="clinical-info-label" size="xs" fw={650}>
        {node.label}
      </Text>
      {node.rows.length === 0 && node.display === "summary" ? (
        <Text size="xs" c="dimmed">
          No records on file
        </Text>
      ) : node.display === "list" ? (
        <ul aria-label={node.label} className="clinical-info-list">
          {node.rows.length === 0 && <li>No records on file</li>}
          {node.rows.map((row, index) => (
            <li key={index}>
              {row.map(([key, value]) => (
                <span key={key}>
                  <span className="record-label">{key}: </span>
                  {value}
                </span>
              ))}
            </li>
          ))}
        </ul>
      ) : node.display === "summary" ? (
        <dl aria-label={node.label} className="clinical-summary">
          {node.rows.flatMap((row, index) =>
            row.map(([key, value]) => (
              <div key={`${index}-${key}`}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            )),
          )}
        </dl>
      ) : (
        <>
          {node.display === "trend" && values.length > 0 && (
            <svg
              role="img"
              aria-label={`${node.label} trend`}
              viewBox="0 0 300 76"
              className="clinical-sparkline"
            >
              <path
                d="M10 62H290 M10 38H290 M10 14H290"
                stroke="#e3eaee"
                strokeWidth="1"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#187c80"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {values.map((value, index) => (
                <circle
                  key={index}
                  cx={10 + (index * 280) / Math.max(1, values.length - 1)}
                  cy={62 - ((value - low) * 48) / range}
                  r="3"
                  fill="#187c80"
                />
              ))}
            </svg>
          )}
          <InfoTable node={node} />
        </>
      )}
    </div>
  );
}
export function AlertNode({ node }: Props<"alert">) {
  const color = /critical|error|high|danger|interruptive/i.test(node.severity)
    ? "red"
    : /warn|moderate/i.test(node.severity)
      ? "yellow"
      : "blue";
  return (
    <Alert
      role="alert"
      aria-label={node.label}
      color={color}
      variant="light"
      data-comp-id={node.comp}
      className="clinical-alert"
      icon={<span aria-hidden="true">!</span>}
    >
      <Text size="sm" fw={550}>
        {node.label}
      </Text>
    </Alert>
  );
}
export function ButtonNode({ node, onEvent }: Props<"button">) {
  const primary = node.role === "primary";
  const reasonId = useId();
  return (
    <div className={`clinical-action${primary ? " primary-action" : ""}`}>
      <Tooltip
        label={node.blockedReason ?? "Unavailable"}
        disabled={node.enabled}
        multiline
        maw={360}
        withArrow
      >
        <span className="button-tooltip-target">
          <Button
            size="xs"
            variant={
              primary
                ? "filled"
                : node.role === "ack"
                  ? "filled"
                  : node.role === "macro"
                    ? "light"
                    : "subtle"
            }
            disabled={!node.enabled}
            aria-label={node.label}
            aria-describedby={
              !node.enabled && node.blockedReason ? reasonId : undefined
            }
            title={node.enabled ? undefined : (node.blockedReason ?? undefined)}
            data-comp-id={node.comp}
            data-event={
              node.role === "ack"
                ? "ack"
                : node.role === "confirm"
                  ? "confirm"
                  : "click"
            }
            onClick={() =>
              onEvent(
                node.role === "ack"
                  ? { ack: { alert: node.comp } }
                  : node.role === "confirm"
                    ? { confirm: { comp: node.comp } }
                    : { click: { comp: node.comp } },
              )
            }
            rightSection={
              node.hotkey ? (
                <Kbd aria-hidden="true" size="xs">
                  {node.hotkey}
                </Kbd>
              ) : undefined
            }
          >
            {node.label}
          </Button>
        </span>
      </Tooltip>
      {!node.enabled && node.blockedReason && (
        <Text id={reasonId} size="xs" className="clinical-blocked">
          {node.blockedReason}
        </Text>
      )}
    </div>
  );
}
export function TextNode({ node }: Props<"text">) {
  return (
    <Text size="sm" className="clinical-copy">
      {node.s}
    </Text>
  );
}
function unreachable(node: never): never {
  throw new Error(`Unknown semantic UI node: ${String(node)}`);
}
/** Exhaustive dispatch: extending the wire union requires a matching component. */
export function UiNodeView({
  node,
  onEvent,
  confirmProvided = false,
}: {
  node: UiNode;
  onEvent: Emit;
  confirmProvided?: boolean;
}) {
  switch (true) {
    case "section" in node:
      return <SectionNode node={node.section} onEvent={onEvent} />;
    case "columns" in node:
      return <ColumnsNode node={node.columns} onEvent={onEvent} />;
    case "tabs" in node:
      return <TabsNode node={node.tabs} onEvent={onEvent} />;
    case "stepper" in node:
      return <StepperNode node={node.stepper} onEvent={onEvent} />;
    case "field" in node:
      return (
        <FieldNode
          node={node.field}
          onEvent={onEvent}
          confirmProvided={confirmProvided}
        />
      );
    case "info" in node:
      return <InfoNode node={node.info} onEvent={onEvent} />;
    case "alert" in node:
      return <AlertNode node={node.alert} onEvent={onEvent} />;
    case "button" in node:
      return <ButtonNode node={node.button} onEvent={onEvent} />;
    case "text" in node:
      return <TextNode node={node.text} onEvent={onEvent} />;
    default:
      return unreachable(node);
  }
}
