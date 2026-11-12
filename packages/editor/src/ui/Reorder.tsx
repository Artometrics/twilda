import { createContext, useContext, useMemo, useRef, type PointerEvent, type ReactNode } from "react";

interface ReorderApi {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
}

const ReorderContext = createContext<ReorderApi | null>(null);

export function useReorder(): ReorderApi {
  const value = useContext(ReorderContext);
  if (!value) throw new Error("A drag handle was rendered outside the reorder list.");
  return value;
}

export function ReorderList({
  order,
  onMove,
  children,
}: {
  order: string[];
  onMove: (id: string, to: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  const api = useMemo<ReorderApi>(
    () => ({
      onPointerDown(event) {
        if (event.button !== 0) return;
        const id = event.currentTarget.dataset.dragId;
        if (!id) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragId.current = id;
      },
      onPointerUp(event) {
        const id = dragId.current;
        dragId.current = null;
        const list = ref.current;
        if (!id || !list) return;
        const rows = [...list.querySelectorAll<HTMLElement>("[data-reorder-item]")];
        const from = rows.findIndex((row) => row.dataset.id === id);
        if (from < 0) return;
        let to = from;
        let best = Number.POSITIVE_INFINITY;
        rows.forEach((row, index) => {
          const box = row.getBoundingClientRect();
          const distance = Math.abs(event.clientY - (box.top + box.height / 2));
          if (distance < best) {
            best = distance;
            to = index;
          }
        });
        if (to !== from) onMove(id, to);
      },
    }),
    [onMove],
  );

  return (
    <ReorderContext.Provider value={api}>
      <div ref={ref} className="reorder" data-testid="reorder-list" data-reorder-list="" data-order={order.join(" ")}>
        {children}
      </div>
    </ReorderContext.Provider>
  );
}

export function GripIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 3h2.2v2.2H5V3zm5.8 0H13v2.2h-2.2V3zM5 7.9h2.2v2.2H5V7.9zm5.8 0H13v2.2h-2.2V7.9zM5 12.8h2.2V15H5v-2.2zm5.8 0H13V15h-2.2v-2.2z"
      />
    </svg>
  );
}

export function ItemFrame({
  id,
  index,
  count,
  label,
  summary,
  collapsed,
  onToggle,
  onMoveBy,
  onRemove,
  children,
}: {
  id: string;
  index: number;
  count: number;
  label: string;
  summary: string;
  collapsed: boolean;
  onToggle: () => void;
  onMoveBy: (delta: number) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const reorder = useReorder();
  return (
    <section
      className={collapsed ? "item is-collapsed" : "item"}
      data-reorder-item=""
      data-id={id}
      data-testid={`item-${id}`}
    >
      <div className="item-bar">
        <button
          type="button"
          className="grip"
          data-drag-id={id}
          data-testid={`handle-${id}`}
          aria-label={`Drag to reorder ${label}`}
          onPointerDown={reorder.onPointerDown}
          onPointerUp={reorder.onPointerUp}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onMoveBy(-1);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              onMoveBy(1);
            }
          }}
        >
          <GripIcon />
        </button>
        <button
          type="button"
          className="item-title"
          data-testid={`toggle-${id}`}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${label}`}
          onClick={onToggle}
        >
          <span className="item-type">{label}</span>
          {collapsed ? <span className="item-summary">{summary}</span> : null}
        </button>
        <button
          type="button"
          className="btn btn-icon"
          data-testid={`up-${id}`}
          aria-label={`Move ${label} up`}
          disabled={index === 0}
          onClick={() => onMoveBy(-1)}
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          className="btn btn-icon"
          data-testid={`down-${id}`}
          aria-label={`Move ${label} down`}
          disabled={index === count - 1}
          onClick={() => onMoveBy(1)}
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>
      {collapsed ? null : (
        <div className="item-body">
          {children}
          <button
            type="button"
            className="btn btn-danger"
            data-testid={`delete-${id}`}
            aria-label={`Delete ${label}`}
            onClick={onRemove}
          >
            Delete {label.toLowerCase()}
          </button>
        </div>
      )}
    </section>
  );
}
