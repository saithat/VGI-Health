import { useContext, useId, useState } from "react";
import { usePresentation } from "./presentations";
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
  Textarea,
  Tooltip,
} from "@mantine/core";
import type { Event } from "../../../../lean/generated/ehr-types";
import { entryEvent } from "./events";
import { ClinicalIcon } from "./Icons";
import { DisplayValue, severityTone, statusTone } from "./display";
import { clinicalTokens } from "./theme";
import { EntryHintsContext, SourceLabelsContext } from "./SourceLabels";
import { StructuredInfo } from "./presentations/StructuredInfo";
import { PresentationContext, rowLayout } from "./presentations/row-layout";
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
  const first = node.children[0];
  const toggle =
    first && "button" in first && first.button.role === "toggle"
      ? first.button
      : null;
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
        {toggle && <ButtonNode node={toggle} onEvent={onEvent} />}
      </div>
      <Stack gap="sm" className="clinical-section-body">
        <UiChildren
          nodes={toggle ? node.children.slice(1) : node.children}
          onEvent={onEvent}
        />
      </Stack>
    </Paper>
  );
}
export function ColumnsNode({ node, onEvent }: Props<"columns">) {
  return (
    <SimpleGrid
      cols={{ base: 1, lg: Math.min(2, Math.max(1, node.children.length)) }}
      spacing="md"
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
          <Tabs.Tab
            key={index}
            value={String(index)}
            data-comp-id={node.id}
            data-event="selectTab"
            data-tab-index={index}
          >
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
          className={index === node.current ? "current" : ""}
        >
          <span className="step-number" aria-hidden="true">
            {index + 1}
          </span>
          <span className="step-label">{label}</span>
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
  const sourceLabels = useContext(SourceLabelsContext);
  const entryHint = useContext(EntryHintsContext).find(
    ([comp]) => comp === node.comp,
  )?.[1];
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
    description: entryHint,
    descriptionProps: { className: "clinical-entry-hint" },
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
      className={`clinical-field${kind === "textarea" ? " field-narrative" : ""}${node.pendingConfirm ? " pending" : ""}${special ? ` field-${special}` : ""}${kind === "search" ? " field-search" : ""}`}
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
            leftSection={<ClinicalIcon name="lock" />}
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
          rightSection={<ClinicalIcon name="chevron" />}
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
      ) : kind === "textarea" ? (
        <Textarea
          {...common}
          value={node.value ?? ""}
          onChange={(e) => send(e.currentTarget.value)}
          minRows={3}
          autosize
          autoComplete="off"
        />
      ) : (
        <TextInput
          {...common}
          value={node.value ?? ""}
          onChange={(e) => send(e.currentTarget.value)}
          autoComplete="off"
          placeholder={
            kind === "search"
              ? node.label
              : special === "identity"
                ? "Re-enter patient identifiers"
                : special === "scan"
                  ? "Scan or enter barcode"
                  : special === "cosign"
                    ? "Enter clinician ID"
                    : "Enter value"
          }
          leftSection={
            special === "scan" ? (
              <ClinicalIcon name="barcode" />
            ) : kind === "search" ? (
              <ClinicalIcon name="search" />
            ) : undefined
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
              <DisplayValue
                value={
                  sourceLabels.find(
                    ([source]) => source === node.provenance,
                  )?.[1] ?? "Prefilled value"
                }
              />
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
function RecordValue({ label, value }: { label: string; value: string }) {
  const tone =
    /status|confirmation|review state|scheduled|administration|^\d{1,2}:\d{2}/i.test(
      label,
    )
      ? statusTone(value)
      : undefined;
  return (
    <span className={tone ? `clinical-status status-${tone}` : undefined}>
      <DisplayValue value={value} />
    </span>
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
        withColumnBorders={false}
        aria-label={node.label}
        data-medication-grid={
          headers.some((header) => /^(medication|drug)$/i.test(header)) ||
          undefined
        }
        fz="xs"
        verticalSpacing={6}
        horizontalSpacing={6}
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
                <Table.Td
                  key={header}
                  data-numeric={
                    /^(value|result|dose|quantity|weight)$/i.test(header) ||
                    undefined
                  }
                >
                  <RecordValue
                    label={header}
                    value={row.find(([key]) => key === header)?.[1] ?? "—"}
                  />
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}
/** Metadata moves to the row's accessible name and a native tooltip. Values
 * are supplied by Lean; this only changes typography and repeated labels. */
function ChartRecordList({ node }: { node: NodeOf<"info"> }) {
  const notes =
    node.infoId === "encounterNotes" || node.infoId === "priorNotes";
  return (
    <ul
      aria-label={node.label}
      className={notes ? "clinical-note-list" : "clinical-home-meds"}
    >
      {node.rows.length === 0 && <li>No records on file</li>}
      {node.rows.map((row, index) => {
        const value = (key: string) =>
          row.find(([label]) => label === key)?.[1] ?? "";
        const original = row
          .map(([key, value]) => `${key}: ${value}`)
          .join(" · ");
        const known = (text: string) =>
          text && !/^unknown$|^not recorded$/i.test(text);
        return (
          <li key={index} aria-label={original} title={original}>
            {notes ? (
              <article className="clinical-note-card">
                <div className="clinical-note-meta">
                  {[value("Date"), value("Type"), value("Author")]
                    .filter(known)
                    .map((text, index) => (
                      <span key={index}>
                        <DisplayValue value={text} />
                      </span>
                    ))}
                </div>
                <strong className="clinical-note-title">
                  {value("Title").replace(
                    /\. Source date \d{4}-\d{2}-\d{2}; structured dates shifted \d+ days\. Note text retained verbatim\.?$/i,
                    "",
                  ) || "Clinical note"}
                </strong>
                <div className="clinical-note-body">
                  {value("Text") || "No note text supplied"}
                </div>
                {known(value("Status")) && (
                  <span className="clinical-note-status">
                    {value("Status")}
                  </span>
                )}
              </article>
            ) : (
              <>
                <span className="home-med-name">{value("Item")}</span>
                <span className="home-med-sig">
                  {value("Detail")
                    .replace(/^Reported home medication;\s*/i, "")
                    .replace(/;\s*date:\s*Unknown/gi, "")}
                </span>
                <span className="clinical-status status-blue">reported</span>
                {known(value("Status")) && (
                  <span className="home-med-status">{value("Status")}</span>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
export function InfoNode({ node, onEvent }: Props<"info">) {
  const presentation = useContext(PresentationContext);
  if (presentation) {
    const slots = presentation.rows.get(node);
    const actions =
      slots &&
      new Map(
        [...slots].map(([row, nodes]) => [
          row,
          <UiChildren key={row} nodes={nodes} onEvent={onEvent} />,
        ]),
      );
    return (
      <StructuredInfo node={node} kind={presentation.kind} actions={actions} />
    );
  }
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
      ) : node.display === "list" &&
        (["encounterNotes", "priorNotes"].includes(node.infoId) ||
          (node.infoId === "importedHistory" &&
            node.rows.every((row) =>
              row.some(
                ([key, value]) =>
                  key === "Kind" && value === "Home medications (reported)",
              ),
            ))) ? (
        <ChartRecordList node={node} />
      ) : node.display === "list" ? (
        <ul aria-label={node.label} className="clinical-info-list">
          {node.rows.length === 0 && <li>No records on file</li>}
          {node.rows.map((row, index) => (
            <li key={index}>
              {row.map(([key, value], fieldIndex) => (
                <span
                  key={key}
                  className={
                    fieldIndex === 0 ? "record-primary" : "record-secondary"
                  }
                >
                  {fieldIndex > 0 && (
                    <span className="record-label">{key}: </span>
                  )}
                  <RecordValue label={key} value={value} />
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
                <dd>
                  <RecordValue label={key} value={value} />
                </dd>
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
                stroke={clinicalTokens.divider}
                strokeWidth="1"
              />
              <polyline
                points={points}
                fill="none"
                stroke={clinicalTokens.blue.ink}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {values.map((value, index) => (
                <circle
                  key={index}
                  cx={10 + (index * 280) / Math.max(1, values.length - 1)}
                  cy={62 - ((value - low) * 48) / range}
                  r="3"
                  fill={clinicalTokens.blue.ink}
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
  const color = severityTone(node.severity);
  return (
    <Alert
      role="alert"
      aria-label={node.label}
      color={color}
      variant="light"
      data-comp-id={node.comp}
      className="clinical-alert"
      data-alert-tone={color}
      icon={
        <ClinicalIcon
          name={
            color === "green" ? "check" : color === "blue" ? "info" : "warning"
          }
        />
      }
    >
      <Text size="sm" fw={600} c="inherit">
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
            color={
              /^(sign|accept|approve|record administration)/i.test(node.label)
                ? "green"
                : "blue"
            }
            aria-label={node.label}
            aria-describedby={
              !node.enabled && node.blockedReason ? reasonId : undefined
            }
            title={
              !node.enabled
                ? (node.blockedReason ?? undefined)
                : node.role === "toggle"
                  ? node.label
                  : undefined
            }
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
            {node.role === "toggle" ? (
              <ClinicalIcon name="chevron" />
            ) : (
              node.label
            )}
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
      <DisplayValue value={node.s} />
    </Text>
  );
}
function unreachable(node: never): never {
  throw new Error(`Unknown semantic UI node: ${String(node)}`);
}
function PresentationNode({
  node,
  onEvent,
}: {
  node: NodeOf<"presentation">;
  onEvent: Emit;
}) {
  const parent = useContext(PresentationContext);
  const layout = rowLayout(node.kind, node.children, parent);
  return (
    <PresentationContext.Provider value={layout}>
      <UiChildren nodes={node.children} onEvent={onEvent} />
    </PresentationContext.Provider>
  );
}
function RowActionNode({
  node,
  onEvent,
}: {
  node: NodeOf<"rowAction">;
  onEvent: Emit;
}) {
  const layout = useContext(PresentationContext);
  return layout?.embedded.has(node) ? null : (
    <UiChildren nodes={node.children} onEvent={onEvent} />
  );
}
/** Exhaustive dispatch: extending the wire union requires a matching component. */
export function StockUiNodeView({
  node,
  onEvent,
  confirmProvided = false,
}: {
  node: UiNode;
  onEvent: Emit;
  confirmProvided?: boolean;
}) {
  switch (true) {
    case "presentation" in node:
      return <PresentationNode node={node.presentation} onEvent={onEvent} />;
    case "rowAction" in node:
      return <RowActionNode node={node.rowAction} onEvent={onEvent} />;
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

export function UiNodeView(props: {
  node: UiNode;
  onEvent: Emit;
  confirmProvided?: boolean;
}) {
  const original = StockUiNodeView(props);
  return usePresentation(props.node, original);
}
