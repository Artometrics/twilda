import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import type { StorageBackend } from "../contract";
import { downscaleImage } from "../media/downscale";
import { fingerprint, type MediaAsset, type MetaPatch } from "../model";
import { CmsError, createCms } from "../backend/service";
import { FAILURE_LABEL, editorReducer, initialState, isDirty } from "../state/reducer";
import { ArticleList } from "./ArticleList";
import { BlockEditor, SectionEditor } from "./editors";
import { MediaPanel } from "./MediaPanel";
import { Modal } from "./Modal";
import { PreviewPane } from "./PreviewPane";
import { Field } from "./Field";

export function App({ backend }: { backend: StorageBackend }) {
  const cms = useMemo(() => createCms(backend), [backend]);
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const desktop = useDesktop();
  const dismissConfirm = useCallback(() => dispatch({ type: "dismiss-confirm" }), []);
  const busy = state.phase === "busy";
  const draft = state.draft;

  useEffect(() => {
    let cancel = false;
    cms
      .listDocuments()
      .then(async (documents) => {
        const media = await cms.listMedia();
        if (!cancel) dispatch({ type: "hydrated", documents, media });
      })
      .catch((error: unknown) => {
        if (!cancel) {
          dispatch({
            type: "failed",
            phase: "load",
            message: error instanceof Error ? error.message : "The desk could not load.",
          });
        }
      });
    return () => {
      cancel = true;
    };
  }, [cms]);

  useEffect(() => {
    document.title = draft ? `${draft.title} · Twilda` : "Twilda desk";
  }, [draft]);

  async function openDocument(id: string) {
    if (draft && state.saved && fingerprint(draft) !== fingerprint(state.saved)) {
      const leave = window.confirm("This draft has unsaved edits. Leave without saving?");
      if (!leave) return;
    }
    dispatch({ type: "busy", label: "Opening" });
    try {
      const opened = await cms.open(id);
      dispatch({ type: "opened", ...opened });
    } catch (error) {
      dispatch(failure("load", error, "Could not open that document."));
    }
  }

  async function saveDraft() {
    if (!draft) return;
    dispatch({ type: "busy", label: "Saving draft" });
    try {
      const saved = await cms.save(draft);
      const documents = await cms.listDocuments();
      dispatch({ type: "saved", draft: saved, documents });
    } catch (error) {
      dispatch(failure("save", error, "The draft could not be written."));
    }
  }

  async function publishDocument() {
    if (!draft) return;
    dispatch({ type: "busy", label: "Publishing" });
    try {
      const published = await cms.publish(draft);
      const documents = await cms.listDocuments();
      dispatch({ type: "published", draft: published, published, documents });
    } catch (error) {
      const phase = error instanceof CmsError ? error.phase : "publish";
      const extra =
        phase === "build" ? " The draft was saved. The published file was not updated." : "";
      dispatch(failure(phase, error, "Publish failed.", extra));
    }
  }

  async function revertDocument() {
    if (!draft) return;
    const id = draft.id;
    dispatch({ type: "busy", label: "Reverting" });
    try {
      const restored = await cms.revert(id);
      const documents = await cms.listDocuments();
      dispatch({ type: "reverted", draft: restored, published: restored, documents });
    } catch (error) {
      dispatch(failure("revert", error, "The draft could not be restored."));
    }
  }

  async function upload(file: File) {
    dispatch({ type: "busy", label: "Scaling image" });
    try {
      const scaled = await downscaleImage(file);
      const asset: MediaAsset = {
        name: scaled.name,
        path: `media/${scaled.name}`,
        dataUrl: scaled.dataUrl,
        width: scaled.width,
        height: scaled.height,
        scaled: scaled.scaled,
        originalWidth: scaled.originalWidth,
        originalHeight: scaled.originalHeight,
      };
      const stored = await cms.upload(asset);
      dispatch({ type: "uploaded", asset: stored });
    } catch (error) {
      dispatch(failure("upload", error, "The file could not be stored."));
    }
  }

  async function removeMedia(path: string) {
    try {
      await cms.removeMedia(path);
      dispatch({ type: "removed-media", path });
    } catch (error) {
      dispatch(failure("upload", error, "The file could not be removed."));
    }
  }

  function editMeta(patch: MetaPatch) {
    dispatch({ type: "edit-meta", patch });
  }

  const showList = desktop || state.view === "list" || !draft;
  const showMedia = state.view === "media";
  const showEditor = Boolean(draft) && !showMedia && (desktop || state.view === "edit");
  const showPreview = Boolean(draft) && (desktop || state.view === "preview");
  const showActions = Boolean(draft) && (desktop || state.view !== "list");

  return (
    <div className={desktop ? "app desktop" : "app"}>
      <a className="skip" href="#desk-main">
        Skip to the desk
      </a>
      <header className="mast">
        <div className="mark">
          <p className="wordmark">Twilda</p>
          <p className="issue">Field Desk</p>
        </div>
        <p className="mast-status" data-testid="mast-status">
          {busy ? state.busyLabel : statusText(state)}
        </p>
      </header>

      {state.error ? (
        <div className="banner" role="alert" data-testid="error-banner" data-phase={state.error.phase}>
          <strong>{FAILURE_LABEL[state.error.phase]}</strong>
          <p>{state.error.message}</p>
          <button type="button" className="btn" onClick={() => dispatch({ type: "dismiss-error" })}>
            Dismiss
          </button>
        </div>
      ) : null}
      <p className="notice" role="status" data-testid="notice">
        {state.notice ?? ""}
      </p>

      <main id="desk-main" className={draft ? "workspace" : "workspace no-doc"}>
        {showList ? (
          <ArticleList documents={state.documents} activeId={state.activeId} onOpen={(id) => void openDocument(id)} />
        ) : null}
        {desktop && !draft ? (
          <section className="pane pane-empty" aria-label="Desk">
            <header className="pane-head">
              <h2>Desk</h2>
              <p>Open a document. Articles are blocks. Pages are prepared sections. Save and publish stay separate.</p>
            </header>
          </section>
        ) : null}
        {showEditor && draft ? (
          <section className="pane pane-edit" aria-label="Editor">
            <header className="doc-head">
              <p className="kicker">{draft.kicker || (draft.kind === "page" ? "Page" : "Article")}</p>
              <h2>{draft.title}</h2>
            </header>
            <details className="meta">
              <summary>Document fields</summary>
              <Field label="Title" value={draft.title} onChange={(title) => editMeta({ title })} />
              <Field label="Kicker" value={draft.kicker} onChange={(kicker) => editMeta({ kicker })} />
              <Field label="Dek" value={draft.dek} multiline onChange={(dek) => editMeta({ dek })} />
              <Field label="Byline" value={draft.byline} onChange={(byline) => editMeta({ byline })} />
              <Field label="Slug" value={draft.slug} onChange={(slug) => editMeta({ slug })} />
            </details>
            {draft.kind === "article" ? (
              <BlockEditor
                doc={draft}
                media={state.media}
                onChange={(block) => dispatch({ type: "update-block", block })}
                onAdd={(block) => dispatch({ type: "add-block", block })}
                onRemove={(id) => dispatch({ type: "remove-block", id })}
                onMove={(id, to) => dispatch({ type: "move-block", id, to })}
              />
            ) : (
              <SectionEditor
                doc={draft}
                onChange={(section) => dispatch({ type: "update-section", section })}
                onAdd={(section) => dispatch({ type: "add-section", section })}
                onRemove={(id) => dispatch({ type: "remove-section", id })}
                onMove={(id, to) => dispatch({ type: "move-section", id, to })}
              />
            )}
          </section>
        ) : null}
        {showMedia ? (
          <MediaPanel media={state.media} busy={busy} onUpload={(file) => void upload(file)} onRemove={(path) => void removeMedia(path)} />
        ) : null}
        {showPreview && draft ? (
          <PreviewPane doc={draft} media={state.media} previewUrl={state.previewUrl} />
        ) : null}
      </main>

      {showActions ? (
        <div className="actions">
          <button type="button" className="btn" data-testid="save-draft" disabled={busy} onClick={() => void saveDraft()}>
            Save draft
          </button>
          <button
            type="button"
            className="btn btn-primary"
            data-testid="publish"
            disabled={busy}
            onClick={() => dispatch({ type: "ask-confirm", confirm: "publish" })}
          >
            Publish
          </button>
          <button
            type="button"
            className="btn"
            data-testid="revert"
            disabled={busy || !state.published}
            onClick={() => dispatch({ type: "ask-confirm", confirm: "revert" })}
          >
            Revert
          </button>
        </div>
      ) : null}

      <nav className="tabs" aria-label="Desk">
        <Tab id="list" label="Documents" current={state.view} onSelect={(view) => dispatch({ type: "view", view })} />
        <Tab id="edit" label="Edit" current={state.view} onSelect={(view) => dispatch({ type: "view", view })} />
        <Tab id="preview" label="Preview" current={state.view} onSelect={(view) => dispatch({ type: "view", view })} />
        <Tab id="media" label="Media" current={state.view} onSelect={(view) => dispatch({ type: "view", view })} />
      </nav>

      {state.confirm ? (
        <Modal title={state.confirm === "publish" ? "Publish this document?" : "Revert the draft?"} testId="confirm-dialog" onClose={dismissConfirm}>
          {state.confirm === "publish" ? (
            <p>
              Publishing writes the copy you are looking at, including unsaved edits, to the published file. Saving a
              draft does not do this. The static site reads the published file the next time it is built.
            </p>
          ) : (
            <p>This replaces the draft with the published copy. Edits that were never published are discarded.</p>
          )}
          <div className="sheet-actions">
            <button type="button" className="btn" data-testid="confirm-cancel" autoFocus onClick={dismissConfirm}>
              Cancel
            </button>
            {state.confirm === "publish" ? (
              <button type="button" className="btn btn-primary" data-testid="confirm-publish" onClick={() => void publishDocument()}>
                Publish
              </button>
            ) : (
              <button type="button" className="btn" data-testid="confirm-revert" onClick={() => void revertDocument()}>
                Revert
              </button>
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Tab({
  id,
  label,
  current,
  onSelect,
}: {
  id: "list" | "edit" | "preview" | "media";
  label: string;
  current: "list" | "edit" | "preview" | "media";
  onSelect: (view: "list" | "edit" | "preview" | "media") => void;
}) {
  return (
    <button
      type="button"
      data-testid={`tab-${id}`}
      aria-current={current === id ? "page" : undefined}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}

function statusText(state: typeof initialState): string {
  if (!state.draft || !state.saved) return "Choose a document";
  if (isDirty(state)) return "Unsaved edits";
  if (!state.published) return "Draft only";
  if (fingerprint(state.draft) !== fingerprint(state.published)) return "Unpublished changes";
  return "Matches published";
}

function failure(
  phase: "load" | "save" | "build" | "publish" | "revert" | "upload",
  error: unknown,
  fallback: string,
  extra = "",
) {
  const message = `${error instanceof CmsError ? error.message : error instanceof Error ? error.message : fallback}${extra}`;
  return { type: "failed" as const, phase: error instanceof CmsError ? error.phase : phase, message };
}

function useDesktop(): boolean {
  const query = "(min-width: 960px)";
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setDesktop(media.matches);
    media.addEventListener("change", onChange);
    setDesktop(media.matches);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return desktop;
}
