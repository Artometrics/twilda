import { PART_FIELDS, blankItem, createId, type FieldSpec, type ListSpec, type PartFieldSpec } from "@twilda/core";
import { useState } from "react";
import { Field } from "./Field";

type Record_ = Record<string, unknown>;

function specFor(kind: "section" | "block", type: string): PartFieldSpec | null {
  return (kind === "section" ? PART_FIELDS.sections : PART_FIELDS.blocks)[type] ?? null;
}

/** True when this part type is edited by the generic form (the mode sections and blocks). */
export function hasGenericFields(kind: "section" | "block", type: string): boolean {
  return specFor(kind, type) !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** One short string per line. Blank lines stay on screen while typing and never reach the document. */
function LinesField({ label, value, testId, onChange }: { label: string; value: string[]; testId: string; onChange: (value: string[]) => void }) {
  const [raw, setRaw] = useState(value.join("\n"));
  const shown = raw.split("\n").filter((line) => line.trim() !== "").join("\n") === value.join("\n") ? raw : value.join("\n");
  return (
    <Field
      label={label}
      value={shown}
      multiline
      testId={testId}
      onChange={(next) => {
        setRaw(next);
        onChange(next.split("\n").map((line) => line.trim()).filter((line) => line !== ""));
      }}
    />
  );
}

function ScalarField({ spec, value, testId, onChange }: { spec: FieldSpec; value: unknown; testId: string; onChange: (value: string | boolean | string[]) => void }) {
  if (spec.kind === "lines") {
    return <LinesField label={spec.label} value={Array.isArray(value) ? (value as string[]) : []} testId={testId} onChange={onChange} />;
  }
  if (spec.kind === "boolean") {
    return (
      <label className="field field-check">
        <input type="checkbox" data-testid={testId} checked={value === true} onChange={(event) => onChange(event.target.checked)} />
        <span>{spec.label}</span>
      </label>
    );
  }
  return <Field label={spec.label} value={asText(value)} multiline={spec.kind === "multiline"} testId={testId} onChange={onChange} />;
}

function ListEditor({ list, part, partId, onChange }: { list: ListSpec; part: Record_; partId: string; onChange: (next: Record_) => void }) {
  const items = Array.isArray(part[list.key]) ? (part[list.key] as unknown[]) : [];
  const set = (next: unknown[]) => onChange({ ...part, [list.key]: next });
  return (
    <div className="stack generic-list" data-testid={`list-${partId}-${list.key}`}>
      <h4 className="generic-list-title">
        {list.label} <span className="hint">({items.length})</span>
      </h4>
      {items.map((item, index) => {
        const key = typeof item === "string" ? `${list.key}-${index}` : asText((item as Record_).id) || `${list.key}-${index}`;
        return (
          <div className="subrow" key={key}>
            {list.stringLabel ? (
              <Field
                label={`${list.stringLabel} ${index + 1}`}
                value={asText(item)}
                testId={`item-${partId}-${list.key}-${index}`}
                onChange={(value) => set(items.map((entry, at) => (at === index ? value : entry)))}
              />
            ) : (
              (list.fields ?? []).map((spec) => (
                <ScalarField
                  key={spec.key}
                  spec={spec}
                  value={(item as Record_)[spec.key]}
                  testId={`item-${partId}-${list.key}-${index}-${spec.key}`}
                  onChange={(value) => set(items.map((entry, at) => (at === index ? { ...(entry as Record_), [spec.key]: value } : entry)))}
                />
              ))
            )}
            <button
              type="button"
              className="btn"
              data-testid={`remove-${partId}-${list.key}-${index}`}
              disabled={items.length <= list.min}
              onClick={() => set(items.filter((_, at) => at !== index))}
            >
              Remove {list.itemLabel}
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="btn"
        data-testid={`add-${partId}-${list.key}`}
        disabled={items.length >= list.max}
        onClick={() => set([...items, blankItem(list, createId(list.idPrefix))])}
      >
        Add {list.itemLabel}
      </button>
    </div>
  );
}

/**
 * A form for any mode section or block, built from the field list in `@twilda/core`. Each control
 * writes one string (or one checkbox); the schema, not this form, decides whether the result is valid.
 */
export function GenericFields<T extends { id: string; type: string }>({
  kind,
  part,
  onChange,
}: {
  kind: "section" | "block";
  part: T;
  onChange: (next: T) => void;
}) {
  const spec = specFor(kind, part.type);
  if (!spec) return null;
  const record = part as unknown as Record_;
  const change = (next: Record_) => onChange(next as unknown as T);
  return (
    <>
      {spec.fields.map((field) => (
        <ScalarField
          key={field.key}
          spec={field}
          value={record[field.key]}
          testId={`field-${part.id}-${field.key}`}
          onChange={(value) => change({ ...record, [field.key]: value })}
        />
      ))}
      {spec.lists.map((list) => (
        <ListEditor key={list.key} list={list} part={record} partId={part.id} onChange={change} />
      ))}
    </>
  );
}
