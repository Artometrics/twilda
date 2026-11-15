import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { StorageBackend } from "../contract";
import type { KeyValueStore } from "../backend/persistent";
import { seedArtometrics } from "../backend/artometrics";
import platesList from "virtual:twilda-plates";
import siteText from "virtual:twilda-site";
import {
  SITE_PATH,
  defaultSite,
  parseSite,
  serializeSite,
  type MergeChoice,
  type MergeConflict,
  type SiteSettings,
} from "@twilda/core";
import { prepareImage } from "@twilda/core/edit";
import { parseDocJson, uniqueSlug } from "../doc";
import { createFromTemplate } from "../templates";
import { docByline, fingerprint, type MediaAsset, type MetaPatch } from "../model";
import { CmsError, createCms } from "../backend/service";
import { FAILURE_LABEL, canRedoDraft, canUndoDraft, editorReducer, initialState, isDirty, type DeskView } from "../state/reducer";
import { Dashboard } from "./Dashboard";
import { BlockEditor, SectionEditor } from "./editors";
import { ExportPanel } from "./ExportPanel";
import { MediaPanel } from "./MediaPanel";
import { Modal } from "./Modal";
import { NewDraftSheet, type NewDraftValues } from "./NewDraftSheet";
import { PagePane } from "./PagePane";
import { Field } from "./Field";
import { githubOwner, githubRepo } from "../github/config";
import {
  GithubConflict,
  GithubSiteConflict,
  openGithubPullRequest,
  openSitePullRequest,
} from "../github/publish";
import { afterPublish, loadSiteSync, loadSync, mediaPayload, saveSiteSync, saveSync } from "../github/sync";
import { ConflictSheet } from "./ConflictSheet";
import { GithubPanel } from "./GithubPanel";
import { ThemePanel } from "./ThemePanel";

const AUTOSAVE_MS = 250;
/** How long a pasted token is kept in memory before the desk forgets it. */
const TOKEN_LIFETIME_MS = 30 * 60 * 1000;

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
  const [githubToken, setGithubToken] = useState("");
  useEffect(() => {
    // The token lives only in this component's state. Leaving the page, or 30 minutes after it was pasted, forgets it.
    if (!githubToken) return undefined;
    const forget = () => setGithubToken("");
    const timer = window.setTimeout(forget, TOKEN_LIFETIME_MS);
    window.addEventListener("pagehide", forget);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", forget);
    };
  }, [githubToken]);
  const [githubOwnerName, setGithubOwnerName] = useState(githubOwner);
  const [githubRepoName, setGithubRepoName] = useState(githubRepo);
  const [panelOpen, setPanelOpen] = useState(false);
  const repoSite = useMemo(() => {
    try {
      return siteText ? parseSite(siteText) : defaultSite();
    } catch {
      return defaultSite();
    }
  }, []);
  const [site, setSite] = useState<SiteSettings>(repoSite);
  const [conflict, setConflict] = useState<{ kind: "doc" | "site"; conflicts: MergeConflict[] } | null>(null);
  const siteTimer = useRef<number | undefined>(undefined);
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
    let cancel = false;
    backend
      .read(SITE_PATH)
      .then((text) => {
        const stored = parseSite(text);
        if (!cancel) setSite(stored);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [backend]);

  async function writeSite(next: SiteSettings, announce: boolean) {
    let text: string;
    try {
      text = serializeSite(next);
    } catch {
      return;
    }
    try {
      await backend.write(SITE_PATH, text);
      if (announce) dispatch({ type: "notice", message: "Theme saved on this device. The live site is unchanged until you publish it." });
    } catch (error) {
      dispatch(failure("save", error, "The theme could not be written."));
    }
  }

  function changeSite(next: SiteSettings) {
    setSite(next);
    window.clearTimeout(siteTimer.current);
    siteTimer.current = window.setTimeout(() => void writeSite(next, true), AUTOSAVE_MS);
  }

  function settleSite(next: SiteSettings) {
    setSite(next);
    window.clearTimeout(siteTimer.current);
    void writeSite(next, false);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: "undo" });
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  async function createNew(values: NewDraftValues) {
    setCreating(false);
    dispatch({ type: "busy", label: "Creating" });
    try {
      const taken = state.documents.map((item) => item.id);
      const doc = createFromTemplate({ ...values, taken });
      const saved = await cms.create(doc);
      const documents = await cms.listDocuments();
      dispatch({ type: "created", draft: saved, documents, notice: `Created ${saved.title}. It is saved as a draft on this device. Tap any text to edit it.` });
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

  async function publishDocument(decisions?: Record<string, MergeChoice>) {
    if (!draft) return;
    setConflict(null);
    dispatch({ type: "busy", label: "Publishing" });
    try {
      let published = await cms.publish(draft);
      let notice: string | undefined;
      if (!githubToken.trim()) {
        notice = "Published on this device. No GitHub token was pasted, so no pull request was opened.";
      } else {
        try {
          const sync = await loadSync(backend, published.id);
          const result = await openGithubPullRequest({
            token: githubToken,
            owner: githubOwnerName,
            repo: githubRepoName,
            doc: published,
            base: sync.base,
            known: sync.sent,
            media: mediaPayload(published, state.media),
            decisions,
          });
          if (result.doc !== published) published = await cms.publish(result.doc);
          await saveSync(backend, published.id, afterPublish(sync, published, result.seen));
          notice = result.rebased
            ? `main had moved. Your edits were merged with it, then published on this device. GitHub pull request: ${result.url}`
            : `Published on this device. GitHub pull request: ${result.url}`;
        } catch (error) {
          if (error instanceof GithubConflict) {
            setConflict({ kind: "doc", conflicts: error.conflicts });
            notice = "Published on this device. main changed things you also edited. Choose which to keep to open the pull request.";
          } else {
            const detail = error instanceof Error ? error.message : "GitHub publish failed.";
            notice = `Published on this device. GitHub pull request was not opened. ${detail}`;
          }
        }
      }
      const documents = await cms.listDocuments();
      dispatch({ type: "published", draft: published, published, documents, notice });
    } catch (error) {
      const phase = error instanceof CmsError ? error.phase : "publish";
      const extra =
        phase === "build" ? " The draft was saved. The published file was not updated." : "";
      dispatch(failure(phase, error, "Publish failed.", extra));
    }
  }

  async function publishTheme(decisions?: Record<string, MergeChoice>) {
    setConflict(null);
    if (!githubToken.trim()) {
      dispatch({ type: "failed", phase: "publish", message: "Paste a GitHub token to publish the theme. It is saved on this device already." });
      return;
    }
    dispatch({ type: "busy", label: "Publishing theme" });
    settleSite(site);
    try {
      const sync = await loadSiteSync(backend);
      const result = await openSitePullRequest({
        token: githubToken,
        owner: githubOwnerName,
        repo: githubRepoName,
        site,
        base: sync.base,
        known: sync.sent,
        decisions,
      });
      if (result.rebased) settleSite(result.site);
      await saveSiteSync(backend, { base: result.seen ?? sync.base, sent: [...sync.sent, result.site] });
      dispatch({
        type: "notice",
        message: `${result.rebased ? "main had moved, so the theme was merged with it. " : ""}Theme pull request: ${result.url}`,
      });
    } catch (error) {
      if (error instanceof GithubSiteConflict) {
        setConflict({ kind: "site", conflicts: error.conflicts });
        dispatch({ type: "notice", message: "main changed theme settings you also changed. Choose which to keep." });
      } else {
        dispatch(failure("publish", error, "The theme could not be published."));
      }
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
    dispatch({ type: "busy", label: "Resizing image" });
    try {
      const taken = [...state.media.map((item) => item.name), ...platesList.map((src) => src.replace("/media/", ""))];
      const prepared = await prepareImage(file, { taken });
      const asset: MediaAsset = {
        name: prepared.name,
        path: `media/${prepared.name}`,
        dataUrl: prepared.dataUrl,
        width: prepared.width,
        height: prepared.height,
        scaled: prepared.scaled,
        originalWidth: prepared.originalWidth,
        originalHeight: prepared.originalHeight,
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

  const view = state.view;
  const sideView: "edit" | "media" | "export" | "theme" = view === "media" || view === "export" || view === "theme" ? view : "edit";
  const showList = desktop || view === "list" || !draft;
  const showPage = Boolean(draft) && (desktop || view === "page");
  const showSide = desktop ? Boolean(draft) && panelOpen : false;
  const showEditor = Boolean(draft) && (desktop ? showSide && sideView === "edit" : view === "edit");
  const showMedia = desktop ? showSide && sideView === "media" : view === "media";
  const showExport = Boolean(draft) && (desktop ? showSide && sideView === "export" : view === "export");
  const showTheme = Boolean(draft) && (desktop ? showSide && sideView === "theme" : view === "theme");
  const selectTab = (next: DeskView) => {
    if (desktop && (next === "edit" || next === "media" || next === "export" || next === "theme")) setPanelOpen(true);
    dispatch({ type: "view", view: next });
  };

  function editorPane() {
    if (!draft) return null;
    return (
      <section className="pane pane-edit" aria-label="Blocks">
        <header className="doc-head">
          <p className="eyebrow">{draft.kicker || (draft.kind === "page" ? "Page" : "Article")}</p>
          <h2 data-testid="doc-title">{draft.title || "Untitled"}</h2>
          <p className="hint">
            Tap text on the page to rewrite it. Use this panel to {draft.kind === "page" ? "add, remove, and reorder sections" : "add, remove, and reorder blocks"}, and for fields the page does not show.
          </p>
        </header>
        <details className="meta">
          <summary data-testid="meta-summary">Document fields</summary>
          <Field label="Title" value={draft.title} testId="meta-title" onChange={(title) => editMeta({ title })} />
          <Field label="Kicker" value={draft.kicker} testId="meta-kicker" onChange={(kicker) => editMeta({ kicker })} />
          <Field label="Dek" value={draft.dek} multiline testId="meta-dek" onChange={(dek) => editMeta({ dek })} />
          {draft.kind === "article" ? (
            <Field label="Byline" value={docByline(draft)} testId="meta-byline" onChange={(byline) => editMeta({ byline })} />
          ) : null}
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
    );
  }

  function mediaPane() {
    return <MediaPanel media={state.media} busy={busy} onUpload={(file) => void upload(file)} onRemove={(path) => void removeMedia(path)} />;
  }

  function themePane() {
    return (
      <ThemePanel
        site={site}
        busy={busy}
        canPublish={Boolean(githubToken.trim())}
        onChange={changeSite}
        onPublish={() => dispatch({ type: "ask-confirm", confirm: "theme" })}
      />
    );
  }

  function exportPane() {
    if (!draft) return null;
    return (
      <ExportPanel
        doc={draft}
        media={state.media}
        dirty={dirty}
        onNotice={(message) => dispatch({ type: "notice", message })}
        onFailure={(message) => dispatch({ type: "failed", phase: "save", message })}
      />
    );
  }

  const actions = draft ? (
    <div className="actions" data-testid="actions">
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
        className="btn btn-quiet"
        data-testid="revert"
        disabled={busy || !state.published}
        onClick={() => dispatch({ type: "ask-confirm", confirm: "revert" })}
      >
        Revert
      </button>
    </div>
  ) : null;

  const tabs = (
    <nav className="tabs" aria-label="Desk">
      {desktop ? null : <Tab id="list" label="Drafts" current={view} onSelect={selectTab} />}
      {desktop ? null : <Tab id="page" label="Page" current={view} onSelect={selectTab} />}
      <Tab id="edit" label="Blocks" current={desktop ? (showSide ? sideView : "page") : view} onSelect={selectTab} />
      <Tab id="theme" label="Theme" current={desktop ? (showSide ? sideView : "page") : view} onSelect={selectTab} />
      <Tab id="export" label="Export" current={desktop ? (showSide ? sideView : "page") : view} onSelect={selectTab} />
      <Tab id="media" label="Media" current={desktop ? (showSide ? sideView : "page") : view} onSelect={selectTab} />
    </nav>
  );

  return (
    <div className={desktop ? "app desktop" : "app"}>
      <a className="skip" href="#desk-main">
        Skip to the desk
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            T
          </span>
          <p className="wordmark">Twilda</p>
        </div>
        <p className="top-status" data-testid="mast-status">
          {busy ? state.busyLabel : statusText(state)}
        </p>
        {desktop && draft ? (
          <>
            {tabs}
            {actions}
          </>
        ) : null}
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

      <main id="desk-main" className={draft ? "workspace" : "workspace no-doc"} data-side={showSide ? "open" : "closed"}>
        {showList ? (
          <Dashboard
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
            <div className="welcome">
              <h2>Write on the page</h2>
              <p>
                Open a draft, or start a new one from a template. Your draft shows up as the real article, and you edit
                it right there. It saves to this device as you type. Publishing opens a pull request.
              </p>
              <button type="button" className="btn btn-primary" data-testid="empty-new" disabled={busy} onClick={() => setCreating(true)}>
                New draft
              </button>
            </div>
          </section>
        ) : null}
        {showPage && draft ? (
          <PagePane
            doc={draft}
            plates={platesList}
            media={state.media}
            site={site}
            previewUrl={state.previewUrl}
            canUndo={canUndoDraft(state)}
            canRedo={canRedoDraft(state)}
            onUndo={() => dispatch({ type: "undo" })}
            onRedo={() => dispatch({ type: "redo" })}
            onEdit={(next) => dispatch({ type: "replace-draft", draft: next })}
            onUploadImage={upload}
          />
        ) : null}
        {desktop && showSide ? (
          <aside className="side" aria-label="Panel">
            <button type="button" className="btn btn-quiet side-close" data-testid="panel-close" onClick={() => setPanelOpen(false)}>
              Hide panel
            </button>
            {showEditor ? editorPane() : null}
            {showMedia ? mediaPane() : null}
            {showTheme ? themePane() : null}
            {showExport ? exportPane() : null}
          </aside>
        ) : null}
        {!desktop && showEditor ? editorPane() : null}
        {!desktop && showMedia ? mediaPane() : null}
        {!desktop && showTheme ? themePane() : null}
        {!desktop && showExport ? exportPane() : null}
      </main>

      {!desktop && draft && (view === "page" || view === "edit") ? actions : null}
      {desktop ? null : tabs}

      {conflict ? (
        <ConflictSheet
          title={conflict.kind === "site" ? "Theme changed on main" : "Page changed on main"}
          conflicts={conflict.conflicts}
          busy={busy}
          onApply={(decisions) => void (conflict.kind === "site" ? publishTheme(decisions) : publishDocument(decisions))}
          onClose={() => setConflict(null)}
        />
      ) : null}

      {creating ? <NewDraftSheet onCreate={(values) => void createNew(values)} onClose={closeCreating} /> : null}

      {state.confirm ? (
        <Modal title={confirmTitle(state.confirm)} testId="confirm-dialog" onClose={dismissConfirm}>
          {state.confirm === "publish" ? (
            <>
              <p>
                Publishing writes the copy you are looking at, including unsaved edits, to the published file on this
                device. Saving a draft does not do this. With a GitHub token it also opens a pull request. Nothing goes
                live until that pull request is merged and the site is rebuilt.
              </p>
              <GithubPanel
                owner={githubOwnerName}
                repo={githubRepoName}
                onOwner={setGithubOwnerName}
                onRepo={setGithubRepoName}
                token={githubToken}
                onToken={setGithubToken}
              />
            </>
          ) : state.confirm === "theme" ? (
            <>
              <p>
                This opens a pull request that changes one file, <code>content/site.json</code>: the masthead and theme tokens for every
                page. Nothing goes live until it is merged and the site is rebuilt.
              </p>
              <GithubPanel
                owner={githubOwnerName}
                repo={githubRepoName}
                onOwner={setGithubOwnerName}
                onRepo={setGithubRepoName}
                token={githubToken}
                onToken={setGithubToken}
              />
            </>
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
            ) : state.confirm === "theme" ? (
              <button type="button" className="btn btn-primary" data-testid="confirm-publish-theme" onClick={() => void publishTheme()}>
                Open pull request
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

function confirmTitle(confirm: "publish" | "revert" | "delete" | "theme"): string {
  if (confirm === "publish") return "Publish this document?";
  if (confirm === "theme") return "Publish the theme?";
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
