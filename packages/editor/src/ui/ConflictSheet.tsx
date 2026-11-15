import { useState } from "react";
import type { MergeChoice, MergeConflict } from "@twilda/core";
import { Modal } from "./Modal";

function show(value: unknown): string {
  if (value === undefined) return "(not set)";
  if (typeof value === "string") return value === "" ? "(empty)" : value;
  return JSON.stringify(value);
}

/**
 * `main` changed the same things this draft changed. Each one is shown with both versions,
 * and a person picks. Nothing is chosen for them, and nothing is written until they apply.
 */
export function ConflictSheet({
  title,
  conflicts,
  busy,
  onApply,
  onClose,
}: {
  title: string;
  conflicts: MergeConflict[];
  busy: boolean;
  onApply: (decisions: Record<string, MergeChoice>) => void;
  onClose: () => void;
}) {
  const [choices, setChoices] = useState<Record<string, MergeChoice>>({});
  const settled = conflicts.every((conflict) => choices[conflict.key]);
  return (
    <Modal title={title} testId="conflict-dialog" onClose={onClose}>
      <p>
        Someone changed this on <code>main</code> since you started. Where you both edited the same thing, choose which to keep. Everything
        else has already been merged.
      </p>
      <ul className="conflicts">
        {conflicts.map((conflict, index) => (
          <li key={conflict.key} data-testid={`conflict-${index}`}>
            <strong>{conflict.label}</strong>
            <fieldset>
              <legend className="sr-only">{conflict.label}</legend>
              <label className="choice">
                <input
                  type="radio"
                  name={`conflict-${index}`}
                  data-testid={`conflict-${index}-ours`}
                  checked={choices[conflict.key] === "ours"}
                  onChange={() => setChoices((now) => ({ ...now, [conflict.key]: "ours" }))}
                />
                <span>
                  <em>Keep mine</em>
                  <q>{show(conflict.ours)}</q>
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name={`conflict-${index}`}
                  data-testid={`conflict-${index}-theirs`}
                  checked={choices[conflict.key] === "theirs"}
                  onChange={() => setChoices((now) => ({ ...now, [conflict.key]: "theirs" }))}
                />
                <span>
                  <em>Take what is on main</em>
                  <q>{show(conflict.theirs)}</q>
                </span>
              </label>
            </fieldset>
          </li>
        ))}
      </ul>
      <div className="sheet-actions">
        <button type="button" className="btn" data-testid="conflict-cancel" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" data-testid="conflict-apply" disabled={!settled || busy} onClick={() => onApply(choices)}>
          Apply and publish
        </button>
      </div>
    </Modal>
  );
}
