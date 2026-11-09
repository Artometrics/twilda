import { useCallback, useEffect, useState } from "react";
import { fetchDocument, fetchDocuments, publish, revert, saveDraft } from "./api";
import { AddDialog } from "./ui/AddDialog";
import { Inspector } from "./ui/Inspector";
import { Preview } from "./ui/Preview";
import { SectionList } from "./ui/SectionList";
import type { DocumentSummary } from "../src/content/store";
import { contentFingerprint } from "../src/schema/fingerprint";
import { moveItem } from "../src/schema/reorder";
import type { ContentDocument, SectionType } from "../src/schema/sections";
import { createSection } from "../src/schema/templates";

const SITE_ORIGIN = "http://127.0.0.1:4321";

type DeskState = "loading" | "unsaved" | "dirty" | "draft-only" | "clean";

function deskState(
  local: ContentDocument | null,
  saved: ContentDocument | null,
  published: ContentDocument | null,
): DeskState {
  if (!local || !saved) return "loading";
  if (contentFingerprint(local) !== contentFingerprint(saved)) return "unsaved";
  if (!published) return "draft-only";
  if (contentFingerprint(saved) !== contentFingerprint(published)) return "dirty";
  return "clean";
}

const STATE_LABEL: Record<DeskState, string> = {
  loading: "Loading",
  unsaved: "Unsaved draft",
  dirty: "Unpublished changes",
  "draft-only": "Draft only",
  clean: "Matches published",
};

export function App() {
  const [summaries, setSummaries] = useState<DocumentSummary[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  const [local, setLocal] = useState<ContentDocument | null>(null);
  const [saved, setSaved] = useState<ContentDocument | null>(null);
  const [published, setPublished] = useState<ContentDocument | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("Loading the desk.");
  const [busy, setBusy] = useState(false);
  const [switchEpoch, setSwitchEpoch] = useState(0);

  const refreshList = useCallback(async () => {
    const { documents } = await fetchDocuments();
    setSummaries(documents);
    return documents;
  }, []);

  const openDocument = useCallback(async (id: string) => {
    const payload = await fetchDocument(id);
    setDocId(id);
    setLocal(payload.draft);
    setSaved(payload.draft);
    setPublished(payload.published);
    setSelectedId(payload.draft.sections[0]?.id ?? null);
    setAdding(false);
  }, []);

  useEffect(() => {
    refreshList()
      .then((documents) => {
        const first = documents.find((doc) => doc.id === "home") ?? documents[0];
        if (!first) throw new Error("No documents in content/.");
        return openDocument(first.id);
      })
      .then(() => setNotice("Desk ready. Save writes a draft. Publish updates the file the static build reads."))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "The desk could not load.");
      });
  }, [openDocument, refreshList]);

  const state = deskState(local, saved, published);

  async function switchDocument(id: string) {
    if (!local || !saved || id === docId) return;
    if (contentFingerprint(local) !== contentFingerprint(saved)) {
      const leave = window.confirm("This draft has unsaved edits. Leave without saving?");
      if (!leave) {
        setSwitchEpoch((epoch) => epoch + 1);
        return;
      }
    }
    setError(null);
    try {
      await openDocument(id);
      setNotice(`Opened ${id}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open that document.");
    }
  }

  async function onSave() {
    if (!local) return;
    setBusy(true);
    setError(null);
    try {
      const result = await saveDraft(local);
      setLocal(result.draft);
      setSaved(result.draft);
      await refreshList();
      setNotice("Draft saved. The published file is unchanged.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!local) return;
    setBusy(true);
    setError(null);
    try {
      const result = await publish(local);
      setLocal(result.draft);
      setSaved(result.draft);
      setPublished(result.published);
      await refreshList();
      setNotice("Published. Run the site or refresh it to read published.json. The static build does not run itself.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevert() {
    if (!local || !published) return;
    if (contentFingerprint(local) !== contentFingerprint(published)) {
      const ok = window.confirm("Replace the draft with the published copy?");
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await revert(local.id);
      setLocal(result.draft);
      setSaved(result.draft);
      setPublished(result.published);
      setSelectedId(result.draft.sections[0]?.id ?? null);
      await refreshList();
      setNotice("Draft reset to the published copy.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Revert failed.");
    } finally {
      setBusy(false);
    }
  }

  function moveSection(id: string, direction: -1 | 1) {
    if (!local) return;
    const from = local.sections.findIndex((section) => section.id === id);
    setLocal({ ...local, sections: moveItem(local.sections, from, from + direction) });
  }

  function dropSection(sourceId: string, targetId: string) {
    if (!local || sourceId === targetId) return;
    const from = local.sections.findIndex((section) => section.id === sourceId);
    const to = local.sections.findIndex((section) => section.id === targetId);
    setLocal({ ...local, sections: moveItem(local.sections, from, to) });
  }

  function removeSection(id: string) {
    if (!local || local.sections.length <= 1) return;
    const index = local.sections.findIndex((section) => section.id === id);
    const sections = local.sections.filter((section) => section.id !== id);
    setLocal({ ...local, sections });
    if (selectedId === id) setSelectedId(sections[Math.max(0, index - 1)]?.id ?? null);
  }

  function addSection(type: SectionType) {
    if (!local) return;
    const section = createSection(type);
    const index = local.sections.findIndex((item) => item.id === selectedId);
    const sections = local.sections.slice();
    sections.splice(index >= 0 ? index + 1 : sections.length, 0, section);
    setLocal({ ...local, sections });
    setSelectedId(section.id);
    setAdding(false);
  }

  const siteHref = !local || local.id === "home" ? SITE_ORIGIN : `${SITE_ORIGIN}/articles/${published?.slug ?? local.slug}`;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>Twilda</strong>
          <span>Desk · dev only</span>
        </div>
        <label className="doc-switch">
          <span>Document</span>
          <select
            key={`${docId ?? "none"}-${switchEpoch}`}
            value={docId ?? ""}
            onChange={(event) => void switchDocument(event.target.value)}
            aria-label="Document"
          >
            {summaries.map((summary) => (
              <option key={summary.id} value={summary.id}>
                {summary.title} · {summary.kind}
                {summary.unpublishedChanges ? " · unpublished" : ""}
              </option>
            ))}
          </select>
        </label>
        <p className="status" role="status" data-state={state}>
          {STATE_LABEL[state]}
        </p>
        <a className="site-link" href={siteHref}>
          Published site
        </a>
        <div className="actions">
          <button type="button" onClick={() => void onRevert()} disabled={busy || !published || state === "clean" || state === "loading"}>
            Revert
          </button>
          <button type="button" onClick={() => void onSave()} disabled={busy || state !== "unsaved"}>
            Save draft
          </button>
          <button
            type="button"
            className="publish"
            onClick={() => void onPublish()}
            disabled={busy || state === "clean" || state === "loading"}
          >
            Publish
          </button>
        </div>
      </header>
      {error ? <p className="banner">{error}</p> : <p className="banner">{notice}</p>}
      {local ? (
        <>
          <SectionList
            sections={local.sections}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveSection}
            onRemove={removeSection}
            onDrop={dropSection}
            onAdd={() => setAdding(true)}
          />
          <Preview doc={local} />
          <Inspector doc={local} selectedId={selectedId} onChange={setLocal} />
          <AddDialog open={adding} kind={local.kind} onClose={() => setAdding(false)} onPick={addSection} />
        </>
      ) : (
        <p className="empty">Opening the demo issue.</p>
      )}
    </div>
  );
}
