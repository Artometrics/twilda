import { useRef } from "react";
import { SECTION_LABELS, type Section } from "../../src/schema/sections";

export function SectionList({
  sections,
  selectedId,
  onSelect,
  onMove,
  onRemove,
  onDrop,
  onAdd,
}: {
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onDrop: (sourceId: string, targetId: string) => void;
  onAdd: () => void;
}) {
  const dragId = useRef<string | null>(null);

  return (
    <aside className="rail">
      <div className="rail-head">
        <div>
          <h2>Sections</h2>
          <p>Drag a handle, or use Up and Down.</p>
        </div>
        <button type="button" onClick={onAdd}>
          Add
        </button>
      </div>
      <ol className="section-list">
        {sections.map((section, index) => {
          const label = SECTION_LABELS[section.type];
          return (
            <li
              key={section.id}
              data-section-id={section.id}
              className={section.id === selectedId ? "selected" : undefined}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const fromTransfer = event.dataTransfer?.getData("text/plain") ?? "";
                const source = fromTransfer || dragId.current;
                if (source) onDrop(source, section.id);
              }}
            >
              <button type="button" className="section-select" onClick={() => onSelect(section.id)}>
                <span className="ord">{String(index + 1).padStart(2, "0")}</span>
                <span>{label}</span>
              </button>
              <div className="row-actions">
                <span
                  className="grip"
                  draggable
                  role="button"
                  tabIndex={0}
                  aria-label={`Drag to reorder ${label}`}
                  onDragStart={(event) => {
                    dragId.current = section.id;
                    event.dataTransfer.setData("text/plain", section.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  Drag
                </span>
                <button
                  type="button"
                  aria-label={`Move ${label} up`}
                  disabled={index === 0}
                  onClick={() => onMove(section.id, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  aria-label={`Move ${label} down`}
                  disabled={index === sections.length - 1}
                  onClick={() => onMove(section.id, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${label}`}
                  disabled={sections.length <= 1}
                  onClick={() => onRemove(section.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
