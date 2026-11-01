import { useContext, useId, useState } from "react";
import { usePresentation } from "./presentations";
import { isCardColumns } from "./layout";
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
  Tabs,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  type InputWrapperProps,
  type SelectProps,
} from "@mantine/core";
import type { Event } from "../../../../lean/generated/ehr-types";
import { entryEvent } from "./events";
import { ClinicalIcon } from "./Icons";
import {
  DisplayValue,
  formatProvenance,
  severityTone,
  statusTone,
  sectionTone,
} from "./display";
import { EntryHintsContext, SourceLabelsContext } from "./SourceLabels";
import { FieldChoicesContext } from "./FieldChoices";
import {
  ClinicalDocument,
  StructuredInfo,
} from "./presentations/StructuredInfo";
import { PresentationContext, rowLayout } from "./presentations/row-layout";
import {
  ChartReferenceContext,
  ExplicitConfirmContext,
  FieldSourceContext,
  ValueSetContext,
} from "./clinical-metadata";
import {
  cleanClinicalText,
  emptyInfoText,
  fieldCaption,
  fieldPlaceholder,
  formatMedicationDirections,
  formatMedicationLine,
  sectionCaption,
} from "./clinical-display";
import type { NodeOf, UiNode } from "./types";
import {
  controlCaption,
  internalSource,
  displayRows,
  vitalGroups,
  observationValue,
  columnCaption,
  medicationTaskCaption,
} from "./clinical-formatters";

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
  const inherited = useContext(ExplicitConfirmContext);
  const explicit = new Set(inherited);
  for (const node of nodes)
    if ("button" in node && node.button.role === "confirm")
      explicit.add(node.button.comp);

  const groups: { nav: boolean; entries: { node: UiNode; index: number }[] }[] =
    [];
  nodes.forEach((node, index) => {
    const nav = "button" in node && node.button.role === "nav";
    const previous = groups.at(-1);
    if (nav && previous?.nav) previous.entries.push({ node, index });
    else groups.push({ nav, entries: [{ node, index }] });
  });
  const drawNode = (node: UiNode, i: number) => (
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
  );
  // Keep adjacent source fields/confirmations together without adding controls.
  // Every field retains its wrapper when a pending confirmation disappears.
  const draw = (node: UiNode, i: number) => {
    if ("field" in node) {
      const next = nodes[i + 1];
      const confirm =
        next &&
        "button" in next &&
        next.button.role === "confirm" &&
        next.button.comp === node.field.comp;
      return (
        <div
          key={i}
          className={`clinical-field-pair${node.field.kind === "textarea" ? " field-pair-narrative" : ""}`}
        >
          {drawNode(node, i)}
          {confirm && drawNode(next, i + 1)}
        </div>
      );
    }
    const previous = nodes[i - 1];
    if (
      "button" in node &&
      node.button.role === "confirm" &&
      previous &&
      "field" in previous &&
      previous.field.comp === node.button.comp
    )
      return null;
    return drawNode(node, i);
  };
  return (
    <ExplicitConfirmContext.Provider value={explicit}>
      {groups.map((group) =>
        group.nav ? (
          <div
            className="clinical-navigation-bar"
            key={group.entries[0]?.index}
          >
            {group.entries.map(({ node, index }) => draw(node, index))}
          </div>
        ) : (
          group.entries.map(({ node, index }) => draw(node, index))
        ),
      )}
    </ExplicitConfirmContext.Provider>
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
      data-section-tone={sectionTone(node.title)}
      role="region"
      aria-label={node.title}
      withBorder
      className="clinical-section"
    >
      <div className="clinical-section-title">
        <h2 title={node.title}>{sectionCaption(node.title)}</h2>
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
  const cards = isCardColumns(node.children);
  return (
    <SimpleGrid
      cols={{
        base: 1,
        sm: Math.min(2, Math.max(1, node.children.length)),
        xl: Math.min(3, Math.max(1, node.children.length)),
      }}
      spacing="xs"
      className={`clinical-columns${cards ? " clinical-card-grid" : ""}`}
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
            aria-label={label}
          >
            {sectionCaption(label)}
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
          <span className="step-label" title={label}>
            {sectionCaption(label)}
          </span>
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
  const [codeSearch, setCodeSearch] = useState("");
  const sourceLabels = useContext(SourceLabelsContext);
  const choiceSet = useContext(FieldChoicesContext).find(
    ([comp]) => comp === node.comp,
  )?.[1];
  const valueSet = useContext(ValueSetContext);
  const choices =
    choiceSet?.options ??
    valueSet?.options.map(({ code, label }): [string, string] => [
      code,
      label,
    ]) ??
    [];
  const allowOther = choiceSet?.allowOther ?? valueSet?.allowCustom ?? false;
  const choiceText = (code: string) =>
    choices.find(([value]) => value === code)?.[1];
  const entryHint = useContext(EntryHintsContext).find(
    ([comp]) => comp === node.comp,
  )?.[1];
  const fieldSources = useContext(FieldSourceContext);
  const sourceCaption = node.provenance
    ? (fieldSources.get(node.comp) ??
      sourceLabels.find(([source]) => source === node.provenance)?.[1] ??
      formatProvenance(node.provenance))
    : undefined;
  const explicitConfirms = useContext(ExplicitConfirmContext);
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
    label: fieldCaption(node.label),
    "aria-label": node.label,
    "aria-describedby": sourceCaption ? `field-source-${node.comp}` : undefined,
    ...(sourceCaption
      ? {
          attributes: {
            input: { "aria-describedby": `field-source-${node.comp}` },
          },
        }
      : {}),
    required: node.required,
    size: "xs" as const,
    "data-comp-id": node.comp,
    "data-event": "enter",
    title: node.label,
    className: "clinical-control",
    description:
      entryHint ??
      (choiceSet?.showCode && node.value ? choiceText(node.value) : undefined),
    classNames: { description: "clinical-entry-hint" },
    ...(!entryHint && choiceSet?.showCode
      ? {
          inputWrapperOrder: [
            "label",
            "input",
            "description",
            "error",
          ] satisfies NonNullable<InputWrapperProps["inputWrapperOrder"]>,
        }
      : {}),
  };
  const options = node.kind
    .split(":")
    .slice(1)
    .join(":")
    .split("|")
    .filter(Boolean);
  const codes = Array.from(
    new Set([
      ...(node.value ? [node.value] : []),
      ...options,
      ...choices.map(([code]) => code),
      ...(allowOther && codeSearch ? [codeSearch] : []),
    ]),
  );
  const choiceData = codes.map((value) => ({
    value,
    label: choiceSet?.showCode
      ? value
      : (choiceText(value) ??
        (value === codeSearch && value !== node.value
          ? `Use code: ${value}`
          : value)),
  }));
  const choiceFilter: NonNullable<SelectProps["filter"]> = ({
    options,
    search,
  }) =>
    options.filter(
      (option) =>
        "value" in option &&
        `${option.value} ${choiceText(option.value) ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
  const choiceOption: NonNullable<SelectProps["renderOption"]> = ({
    option,
  }) => (
    <Text component="span" size="xs" c="inherit">
      {choiceText(option.value)
        ? choiceSet?.showCode
          ? `${choiceText(option.value)} (${option.value})`
          : choiceText(option.value)
        : `Use code: ${option.value}`}
    </Text>
  );
  return (
    <Box
      className={`clinical-field${node.pendingConfirm ? " pending" : ""}${special ? ` field-${special}` : ""}${kind === "textarea" ? " field-narrative" : ""}${kind === "search" ? " field-search" : ""}`}
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
            title="Clinician entry required"
            aria-label="Clinician entry required"
          >
            <ClinicalIcon name="lock" />
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
                {node.unit === "mgPerKg" ? "mg/kg" : node.unit}
              </Text>
            ) : null
          }
          rightSectionWidth={58}
        />
      ) : kind === "coded" || kind === "code" ? (
        <Select
          {...common}
          {...(choices.length
            ? {
                selectFirstOptionOnChange: codeSearch !== "",
                filter: choiceFilter,
                renderOption: choiceOption,
              }
            : {})}
          role="combobox"
          aria-expanded={dropdownOpen}
          onDropdownOpen={() => setDropdownOpen(true)}
          onDropdownClose={() => {
            setDropdownOpen(false);
            setCodeSearch("");
          }}
          rightSection={<ClinicalIcon name="chevron" />}
          searchable
          data={
            choices.length
              ? choiceData
              : codes.map((value) => ({
                  value,
                  label: cleanClinicalText(value),
                }))
          }

          value={node.value}
          placeholder={fieldPlaceholder(node.label, kind)}
          onChange={(value) => {
            send(value ?? "");
            setCodeSearch("");
          }}
          onInput={(event) => {
            // Select's onSearchChange also fires when it synchronizes a supplied
            // value. Only a real input event may turn a code into human entry.
            if (choices.length) setCodeSearch(event.currentTarget.value);
            else if (options.length === 0) send(event.currentTarget.value);
          }}
          nothingFoundMessage="No matching options"
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
                    : undefined
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
              id={`field-source-${node.comp}`}
            >
              <span
                title={sourceCaption ?? formatProvenance(node.provenance)}
                aria-label={sourceCaption ?? formatProvenance(node.provenance)}
              >
                {internalSource(
                  sourceCaption ?? formatProvenance(node.provenance),
                )
                  ? "Source"
                  : (sourceCaption ?? formatProvenance(node.provenance))}
              </span>
            </Badge>
          )}
          {node.pendingConfirm &&
            !confirmProvided &&
            !explicitConfirms.has(node.comp) && (
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
function RecordValue({
  label,
  value,
  medication,
}: {
  label: string;
  value: string;
  medication?: string | undefined;
}) {
  if (label === "Text" || label === "Title") return <span>{value}</span>;
  if (label === "Source" && internalSource(value))
    return (
      <span title={value} aria-label={value}>
        {columnCaption(value) === value
          ? "Source details"
          : columnCaption(value)}
      </span>
    );
  const tone =
    /status|confirmation|review state|scheduled|administration|^\d{1,2}:\d{2}/i.test(
      label,
    )
      ? statusTone(value)
      : undefined;
  return (
    <span
      title={value}
      className={tone ? `clinical-status status-${tone}` : undefined}
    >
      <DisplayValue
        value={
          medication && label === "Instructions"
            ? formatMedicationDirections(medication, value)
            : /^(value|result)$/i.test(label)
              ? observationValue(value)
              : value
        }
      />
    </span>
  );
}
function ReportedMedicationList({ node }: { node: NodeOf<"info"> }) {
  return (
    <ul aria-label={node.label} className="clinical-home-meds">
      {node.rows.map((row, index) => {
        const value = (key: string) =>
          row.find(([label]) => label === key)?.[1] ?? "";
        const original = row
          .map(([key, value]) => `${key}: ${value}`)
          .join(" · ");
        const status = value("Status");
        return (
          <li key={index} aria-label={original} title={original}>
            <span className="home-med-name">
              {formatMedicationLine(
                value("Item"),
                value("Detail")
                  .replace(/^Reported home medication;\s*/i, "")
                  .replace(/;\s*date:\s*Unknown/gi, ""),
              )}
            </span>
            <span className="clinical-status status-blue">reported</span>
            {status && !/^unknown$|^not recorded$/i.test(status) && (
              <span className="home-med-status">{status}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
export function InfoNode({ node, onEvent }: Props<"info">) {
  const presentation = useContext(PresentationContext);
  if (node.display === "document") return <ClinicalDocument node={node} />;
  if (node.display === "status") {
    return (
      <div
        role="status"
        aria-label={node.label}
        className="clinical-info info-status clinical-review-status"
        data-comp-id={node.comp || undefined}
        data-info-id={node.infoId}
      >
        <ClinicalIcon name="check" />
        <span>{node.label}</span>
        {node.rows.map((row, index) => (
          <span key={index}>
            {row.map(([key, value]) => `${key}: ${value}`).join(" · ")}
          </span>
        ))}
      </div>
    );
  }
  const kind =
    presentation?.kind ??
    (node.display === "trend"
      ? "trend"
      : node.display === "list" &&
          ["encounterNotes", "priorNotes"].includes(node.infoId)
        ? "notes"
        : node.display !== "list" && node.display !== "summary"
          ? "table"
          : undefined);
  if (kind) {
    const slots = presentation?.rows.get(node);

    const actions =
      slots &&
      new Map(
        [...slots].map(([row, nodes]) => [
          row,
          <div
            key={row}
            data-row-navigation={
              nodes.length === 1 &&
              nodes[0] &&
              "button" in nodes[0] &&
              nodes[0].button.role === "nav" &&
              nodes[0].button.enabled
                ? "true"
                : undefined
            }
          >
            <UiChildren nodes={nodes} onEvent={onEvent} />
          </div>,
        ]),
      );
    return <StructuredInfo node={node} kind={kind} actions={actions} />;
  }
  const empty = node.rows.length === 0;

  return (
    <div
      className={`clinical-info info-${node.display}`}
      data-section-tone={sectionTone(node.label)}
      data-comp-id={node.comp || undefined}
      data-info-id={node.infoId}
    >
      {!(empty && node.infoId === "orderCatalog") && (
        <Text
          component="h3"
          className="clinical-info-label"
          size="xs"
          fw={650}
          title={node.label}
        >
          {sectionCaption(node.label)}
        </Text>
      )}
      {empty ? (
        <Text
          role="note"
          aria-label={node.label}
          className="clinical-empty"
          size="xs"
          c="dimmed"
        >
          {emptyInfoText(node.infoId)}
        </Text>
      ) : node.display === "list" &&
        node.infoId === "importedHistory" &&
        node.rows.every((row) =>
          row.some(
            ([key, value]) =>
              key === "Kind" && value === "Home medications (reported)",
          ),
        ) ? (
        <ReportedMedicationList node={node} />
      ) : node.display === "list" ? (
        <ul aria-label={node.label} className="clinical-info-list">
          {node.rows.length === 0 && <li>No records on file</li>}
          {vitalGroups(displayRows(node.rows, true, true)).map(
            ({ entries, caption }) => {
              const first = entries[0];
              if (!first) return null;
              const { cells: row, index } = first;
              const source = entries.flatMap((entry) => entry.source);
              return (
                <li
                  key={index}
                  title={source
                    .flat()
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")}
                  aria-label={source
                    .flat()
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")}
                >
                  {caption ??
                    medicationTaskCaption(row) ??
                    row.map(([key, value], fieldIndex) => (
                      <span
                        key={key}
                        className={
                          fieldIndex === 0
                            ? "record-primary"
                            : "record-secondary"
                        }
                      >
                        {fieldIndex > 0 && (
                          <span
                            className="record-label"
                            title={key}
                            aria-label={key}
                          >
                            {columnCaption(key)}:{" "}
                          </span>
                        )}
                        <RecordValue
                          label={key}
                          value={value}
                          medication={
                            node.infoId === "currentMeds"
                              ? row.find(([name]) => name === "Medication")?.[1]
                              : undefined
                          }
                        />
                      </span>
                    ))}
                </li>
              );
            },
          )}
        </ul>
      ) : node.display === "summary" ? (
        <dl aria-label={node.label} className="clinical-summary">
          {node.rows.flatMap((row, index) =>
            row.map(([key, value]) => (
              <div key={`${index}-${key}`}>
                <dt title={key} aria-label={key}>
                  {columnCaption(key)}
                </dt>
                <dd aria-label={value} title={value}>
                  <RecordValue
                    label={key}
                    value={value}
                    medication={
                      node.infoId === "currentMeds"
                        ? row.find(([name]) => name === "Medication")?.[1]
                        : undefined
                    }
                  />
                </dd>
              </div>
            )),
          )}
        </dl>
      ) : (
        <StructuredInfo node={node} kind="table" />
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
    <div
      className={`clinical-action${primary ? " primary-action" : ""}${node.role === "nav" ? " clinical-navigation-action" : ""}`}
    >
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
                    : node.role === "nav"
                      ? "default"
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
              !node.enabled ? (node.blockedReason ?? undefined) : node.label
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
              controlCaption(node.label)
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
    case "valueSet" in node:
      return (
        <ValueSetContext.Provider value={node.valueSet}>
          <UiChildren nodes={node.valueSet.children} onEvent={onEvent} />
        </ValueSetContext.Provider>
      );
    case "chartReferences" in node:
      return (
        <ChartReferenceContext.Provider value={node.chartReferences.references}>
          <UiChildren nodes={node.chartReferences.children} onEvent={onEvent} />
        </ChartReferenceContext.Provider>
      );
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
