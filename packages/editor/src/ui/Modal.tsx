import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  title,
  testId,
  onClose,
  children,
}: {
  title: string;
  testId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      if (dialog.open) dialog.close();
    };
  }, [onClose]);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sheet-title" data-testid={testId}>
      <div className="sheet-head">
        <h2 id="sheet-title">{title}</h2>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
