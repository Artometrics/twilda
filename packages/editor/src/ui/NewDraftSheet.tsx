import { useState } from "react";
import { slugify } from "../doc";
import type { PresetId } from "@twilda/core";
import { templatesForMode } from "../templates";
import { Modal } from "./Modal";

export interface NewDraftValues {
  templateId: string;
  title: string;
  kicker: string;
  byline: string;
  dek: string;
}

export function NewDraftSheet({
  mode,
  onCreate,
  onClose,
}: {
  mode: PresetId;
  onCreate: (values: NewDraftValues) => void;
  onClose: () => void;
}) {
  const available = templatesForMode(mode);
  const [values, setValues] = useState<NewDraftValues>({
    templateId: available[0]!.id,
    title: "",
    kicker: "",
    byline: "",
    dek: "",
  });
  const set = (patch: Partial<NewDraftValues>) => setValues((current) => ({ ...current, ...patch }));
  const ready = values.title.trim().length > 0;
  const template = available.find((item) => item.id === values.templateId) ?? available[0]!;

  return (
    <Modal title="New draft" testId="new-article-dialog" onClose={onClose}>
      <form
        className="sheet-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onCreate(values);
        }}
      >
        <fieldset className="templates">
          <legend>Start from</legend>
          <div className="template-grid" role="radiogroup" aria-label="Template">
            {available.map((item) => (
              <label key={item.id} className={item.id === values.templateId ? "template is-chosen" : "template"}>
                <input
                  type="radio"
                  name="template"
                  value={item.id}
                  data-testid={`template-${item.id}`}
                  checked={item.id === values.templateId}
                  onChange={() => set({ templateId: item.id })}
                />
                <span className="template-kind">{item.kind === "page" ? "Page" : "Article"}</span>
                <span className="template-name">{item.label}</span>
                <span className="template-hint">{item.hint}</span>
              </label>
            ))}
          </div>
          <p className="hint" data-testid="template-outline">
            Parts: {template.outline.join(" · ")}. You can add, remove, and reorder them later.
          </p>
        </fieldset>

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
        {template.kind === "article" ? (
          <label className="field">
            <span>Byline</span>
            <input
              data-testid="new-byline"
              value={values.byline}
              autoComplete="name"
              onChange={(event) => set({ byline: event.target.value })}
            />
          </label>
        ) : null}
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
