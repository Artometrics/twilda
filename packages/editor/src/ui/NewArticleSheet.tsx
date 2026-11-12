import { useState } from "react";
import { slugify } from "../doc";
import { Modal } from "./Modal";

export interface NewArticleValues {
  title: string;
  kicker: string;
  byline: string;
  dek: string;
}

export function NewArticleSheet({
  onCreate,
  onClose,
}: {
  onCreate: (values: NewArticleValues) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<NewArticleValues>({ title: "", kicker: "", byline: "", dek: "" });
  const set = (patch: Partial<NewArticleValues>) => setValues((current) => ({ ...current, ...patch }));
  const ready = values.title.trim().length > 0;

  return (
    <Modal title="New article" testId="new-article-dialog" onClose={onClose}>
      <form
        className="sheet-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onCreate(values);
        }}
      >
        <label className="field">
          <span>Title</span>
          <input
            data-testid="new-title"
            value={values.title}
            autoFocus
            autoComplete="off"
            onChange={(event) => set({ title: event.target.value })}
          />
        </label>
        <p className="hint">Slug: {ready ? slugify(values.title) : "from the title"}</p>
        <label className="field">
          <span>Kicker (for example DRAFT · Sports)</span>
          <input
            data-testid="new-kicker"
            value={values.kicker}
            autoComplete="off"
            onChange={(event) => set({ kicker: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Byline</span>
          <input
            data-testid="new-byline"
            value={values.byline}
            autoComplete="name"
            onChange={(event) => set({ byline: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Dek (one or two lines under the title)</span>
          <textarea data-testid="new-dek" value={values.dek} rows={3} onChange={(event) => set({ dek: event.target.value })} />
        </label>
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" data-testid="new-create" disabled={!ready}>
            Create draft
          </button>
        </div>
      </form>
    </Modal>
  );
}
