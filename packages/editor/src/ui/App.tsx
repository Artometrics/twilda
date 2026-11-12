import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { StorageBackend } from "../contract";
import type { KeyValueStore } from "../backend/persistent";
import { seedArtometrics } from "../backend/artometrics";
import { createArticle, parseDocJson, uniqueSlug } from "../doc";
import { downscaleImage } from "../media/downscale";
import { fingerprint, type MediaAsset, type MetaPatch } from "../model";
import { CmsError, createCms } from "../backend/service";
import { FAILURE_LABEL, editorReducer, initialState, isDirty, type DeskView } from "../state/reducer";
import { ArticleList } from "./ArticleList";
import { BlockEditor, SectionEditor } from "./editors";
import { ExportPanel } from "./ExportPanel";
import { MediaPanel } from "./MediaPanel";
import { Modal } from "./Modal";
import { NewArticleSheet, type NewArticleValues } from "./NewArticleSheet";
import { PreviewPane } from "./PreviewPane";
import { Field } from "./Field";

const AUTOSAVE_MS = 1500;

export function App({
  backend,
  storageKind = "memory",
}: {
  backend: StorageBackend;
  storageKind?: KeyValueStore["kind"];
}) {
  const cms = useMemo(() => createCms(backend), [backend]);
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const [creating, setCreating] = useState(false);
  const desktop = useDesktop();
  const dismissConfirm = useCallback(() => dispatch({ type: "dismiss-confirm" }), []);
  const closeCreating = useCallback(() => setCreating(false), []);
  const busy = state.phase === "busy";
  const draft = state.draft;
  const dirty = isDirty(state);
  const latest = useRef(state);
  latest.current = state;

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

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Safari drops background tabs without warning, so edits are written to the draft
  // after a short pause. This is the draft file only. Publishing stays a separate step.
  useEffect(() => {
    if (!draft || !dirty || state.phase !== "ready") return;
    const snapshot = draft;
    const timer = window.setTimeout(() => {
      cms
        .save(snapshot)
        .then(async (stamped) => {
          if (latest.current.activeId !== stamped.id) return;
          const documents = await cms.listDocuments();
          dispatch({ type: "autosaved", saved: stamped, documents });
        })
        .catch((error: unknown) => dispatch(failure("save", error, "The draft could not be written.")));
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [cms, draft, dirty, state.phase]);

  async function openDocument(id: string) {
    if (draft && dirty) {
      try {
        await cms.save(draft);
      } catch (error) {
        dispatch(failure("save", error, "The draft could not be written."));
        return;
      }
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

  async function createNew(values: NewArticleValues) {
    setCreating(false);
    dispatch({ type: "busy", label: "Creating" });
    try {
      const taken = state.documents.map((item) => item.id);
      const doc = createArticle({ ...values, taken });
      const saved = await cms.create(doc);
      const documents = await cms.listDocuments();
      dispatch({ type: "created", draft: saved, documents, notice: `Created ${saved.title}. It is saved as a draft on this device.` });
    } catch (error) {
      dispatch(failure("save", error, "The draft could not be created."));
    }
  }

  async function importFile(file: File) {
    dispatch({ type: "busy", label: "Importing" });
    try {
      const parsed = parseDocJson(await file.text());
      const taken = state.documents.map((item) => item.id);
      const id = taken.includes(parsed.id) ? uniqueSlug(parsed.id, taken) : parsed.id;
      const saved = await cms.create({ ...parsed, id, slug: id === parsed.id ? parsed.slug : id });
      const documents = await cms.listDocuments();
      const renamed = id === parsed.id ? "" : ` An older copy with the same id exists, so this one is "${id}".`;
      dispatch({ type: "created", draft: saved, documents, notice: `Imported ${saved.title}.${renamed}` });
    } catch (error) {
      dispatch(failure("import", error, "That file could not be imported."));
    }
  }

  async function restoreSamples() {
    dispatch({ type: "busy", label: "Restoring" });
    try {
      const written = await seedArtometrics(backend);
      const documents = await cms.listDocuments();
      dispatch({
        type: "documents",
        documents,
        notice: written === 0 ? "All sample drafts are already here." : `Restored ${written} sample draft${written === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      dispatch(failure("save", error, "The samples could not be restored."));
    }
  }

  async function deleteDocument() {
    if (!draft) return;
    dispatch({ type: "busy", label: "Deleting" });
    try {
      await cms.remove(draft.id);
      const documents = await cms.listDocuments();
      dispatch({ type: "deleted", id: draft.id, documents });
    } catch (error) {
      dispatch(failure("save", error, "The document could not be deleted."));
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

  async function upload(file: File): Promise<MediaAsset | null> {
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
      return stored;
    } catch (error) {
      dispatch(failure("upload", error, "The file could not be stored."));
      return null;
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
  const showExport = Boolean(draft) && state.view === "export";
  const showEditor = Boolean(draft) && !showMedia && !showExport && (desktop || state.view === "edit");
  const showPreview = Boolean(draft) && !showExport && (desktop || state.view === "preview");
  const showActions = Boolean(draft) && (desktop || state.view !== "list");

  return (
    <div className={desktop ? "app desktop" : "app"}>
      <a className="skip" href="#desk-main">
        Skip to the desk
      </a>
      <header className="mast">
        <div className="mark">
          <p className="wordmark">Twilda</p>
          <p className="issue">Desk</p>
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
          <ArticleList
            documents={state.documents}
            activeId={state.activeId}
            storageKind={storageKind}
            busy={busy}
            onOpen={(id) => void openDocument(id)}
            onNew={() => setCreating(true)}
            onImport={(file) => void importFile(file)}
            onRestoreSamples={() => void restoreSamples()}
          />
        ) : null}
        {desktop && !draft ? (
          <section className="pane pane-empty" aria-label="Desk">
            <header className="pane-head">
              <h2>Desk</h2>
              <p>
                Open a draft or start a new article. Articles are prepared blocks. Edits save to this device as you
                type. Export gives you Markdown or MDX for Astro.
              </p>
            </header>
          </section>
        ) : null}
        {showEditor && draft ? (
          <section className="pane pane-edit" aria-label="Editor">
            <header className="doc-head">
              <p className="kicker">{draft.kicker || (draft.kind === "page" ? "Page" : "Article")}</p>
              <h2 data-testid="doc-title">{draft.title || "Untitled"}</h2>
            </header>
            <details className="meta">
              <summary data-testid="meta-summary">Document fields</summary>
              <Field label="Title" value={draft.title} testId="meta-title" onChange={(title) => editMeta({ title })} />
              <Field label="Kicker" value={draft.kicker} testId="meta-kicker" onChange={(kicker) => editMeta({ kicker })} />
              <Field label="Dek" value={draft.dek} multiline testId="meta-dek" onChange={(dek) => editMeta({ dek })} />
              <Field label="Byline" value={draft.byline} testId="meta-byline" onChange={(byline) => editMeta({ byline })} />
              <Field label="Slug" value={draft.slug} testId="meta-slug" onChange={(slug) => editMeta({ slug })} />
              <button
                type="button"
                className="btn btn-danger"
                data-testid="delete-document"
                disabled={busy}
                onClick={() => dispatch({ type: "ask-confirm", confirm: "delete" })}
              >
                Delete this document
              </button>
            </details>
            {draft.kind === "article" ? (
              <BlockEditor
                doc={draft}
                media={state.media}
                onChange={(block) => dispatch({ type: "update-block", block })}
                onAdd={(block) => dispatch({ type: "add-block", block })}
                onRemove={(id) => dispatch({ type: "remove-block", id })}
                onMove={(id, to) => dispatch({ type: "move-block", id, to })}
                onUploadImage={upload}
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
        {showExport && draft ? (
          <ExportPanel
            doc={draft}
            media={state.media}
            dirty={dirty}
            onNotice={(message) => dispatch({ type: "notice", message })}
            onFailure={(message) => dispatch({ type: "failed", phase: "save", message })}
          />
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
        <Tab id="export" label="Export" current={state.view} onSelect={(view) => dispatch({ type: "view", view })} />
        <Tab id="media" label="Media" current={state.view} onSelect={(view) => dispatch({ type: "view", view })} />
      </nav>

      {creating ? <NewArticleSheet onCreate={(values) => void createNew(values)} onClose={closeCreating} /> : null}

      {state.confirm ? (
        <Modal title={confirmTitle(state.confirm)} testId="confirm-dialog" onClose={dismissConfirm}>
          {state.confirm === "publish" ? (
            <p>
              Publishing writes the copy you are looking at, including unsaved edits, to the published file. Saving a
              draft does not do this. The static site reads the published file the next time it is built.
            </p>
          ) : state.confirm === "delete" ? (
            <p>
              This removes the draft and any published copy from this device. Export a JSON backup first if you might
              want it back.
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
            ) : state.confirm === "delete" ? (
              <button type="button" className="btn btn-danger" data-testid="confirm-delete" onClick={() => void deleteDocument()}>
                Delete
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

function confirmTitle(confirm: "publish" | "revert" | "delete"): string {
  if (confirm === "publish") return "Publish this document?";
  if (confirm === "delete") return "Delete this document?";
  return "Revert the draft?";
}

function Tab({
  id,
  label,
  current,
  onSelect,
}: {
  id: DeskView;
  label: string;
  current: DeskView;
  onSelect: (view: DeskView) => void;
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
  if (!state.published) return "Draft saved";
  if (fingerprint(state.draft) !== fingerprint(state.published)) return "Unpublished changes";
  return "Matches published";
}

function failure(
  phase: "load" | "save" | "build" | "publish" | "revert" | "upload" | "import",
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
