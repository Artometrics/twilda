import { useEffect, useRef } from "react";
import { SECTION_CATALOG } from "../../src/schema/templates";
import type { ContentDocument, SectionType } from "../../src/schema/sections";

export function AddDialog({
  open,
  kind,
  onClose,
  onPick,
}: {
  open: boolean;
  kind: ContentDocument["kind"];
  onClose: () => void;
  onPick: (type: SectionType) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const entries = SECTION_CATALOG.filter((entry) => entry.kinds.includes(kind));

  return (
    <dialog
      ref={dialog}
      className="dialog"
      onClose={onClose}
      aria-labelledby="add-section-title"
    >
      <h2 id="add-section-title">Add a prepared section</h2>
      <p>These are the section types prepared for this {kind}. The desk does not draw freeform blocks.</p>
      <div className="catalog">
        {entries.map((entry) => (
          <button key={entry.type} type="button" onClick={() => onPick(entry.type)}>
            <strong>{entry.label}</strong>
            <span>{entry.hint}</span>
          </button>
        ))}
      </div>
      <div className="inline-actions">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
