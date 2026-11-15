import { useMemo, useState } from "react";
import type { KeyValueStore } from "../backend/persistent";
import type { DocStatus, DocSummary } from "../model";
import { formatEdited } from "../time";

type Filter = "all" | DocStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft-only", label: "Drafts" },
  { id: "unpublished", label: "Changed" },
  { id: "published", label: "Published" },
];

const STATUS_LABEL: Record<DocStatus, string> = {
  "draft-only": "Draft · Not published",
  unpublished: "Unpublished changes",
  published: "Published",
};

export function Dashboard({
  documents,
  activeId,
  storageKind,
  busy,
  now = new Date(),
  onOpen,
  onNew,
  onImport,
  onRestoreSamples,
}: {
  documents: DocSummary[];
  activeId: string | null;
  storageKind: KeyValueStore["kind"];
  busy: boolean;
  now?: Date;
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: (file: File) => void;
  onRestoreSamples: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { all: documents.length, "draft-only": 0, unpublished: 0, published: 0 };
    for (const doc of documents) out[doc.status] += 1;
    return out;
  }, [documents]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents
      .filter((doc) => filter === "all" || doc.status === filter)
      .filter((doc) => !needle || `${doc.title} ${doc.kicker} ${doc.dek}`.toLowerCase().includes(needle))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [documents, filter, query]);

  return (
    <section className="pane pane-list" aria-label="Drafts">
      <header className="pane-head">
        <h2>Drafts</h2>
        <button type="button" className="btn btn-primary btn-new" data-testid="new-article" disabled={busy} onClick={onNew}>
          <span aria-hidden="true">+</span> New draft
        </button>
        <p>Everything you are working on. Saved on this device as you type.</p>
      </header>

      <div className="dash-tools">
        <label className="search">
          <span className="sr-only">Search drafts</span>
          <input
            type="search"
            data-testid="search-docs"
            placeholder="Search drafts"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="chips" role="group" aria-label="Filter drafts">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              data-testid={`filter-${item.id}`}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label} <span className="chip-count">{counts[item.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="empty">No drafts yet. Start a new one from a template, or import a JSON backup.</p>
      ) : shown.length === 0 ? (
        <p className="empty" data-testid="no-matches">
          Nothing matches. Clear the search or choose All.
        </p>
      ) : (
        <ul className="cards">
          {shown.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className={doc.id === activeId ? "card is-active" : "card"}
                data-testid={`doc-${doc.id}`}
                aria-current={doc.id === activeId ? "true" : undefined}
                onClick={() => onOpen(doc.id)}
              >
                <span className={`thumb thumb-${doc.kind}`} aria-hidden="true" />
                <span className="card-body">
                  <span className="eyebrow">
                    {doc.kind === "page" ? "Page" : "Article"}
                    {doc.kicker ? ` · ${doc.kicker}` : ""}
                  </span>
                  <span className="card-title">{doc.title}</span>
                  <span className="sub card-dek">{doc.dek}</span>
                  <span className="card-meta">
                    <span className={`badge badge-${doc.status}`} data-testid={`status-${doc.id}`}>
                      {STATUS_LABEL[doc.status]}
                    </span>
                    {doc.verifyCount > 0 ? (
                      <span className="badge badge-verify" data-testid={`verify-${doc.id}`}>
                        {doc.verifyCount} to verify
                      </span>
                    ) : null}
                    <span className="edited" data-testid={`edited-${doc.id}`} title={doc.updatedAt}>
                      Edited {formatEdited(doc.updatedAt, now).toLowerCase()}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="list-actions">
        <label className="btn file-btn">
          Import JSON
          <input
            data-testid="import-input"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onImport(file);
            }}
          />
        </label>
      </div>

      <div className="storage-note" data-testid="storage-note">
        {storageKind === "memory" ? (
          <p>
            <strong>This browser would not keep drafts.</strong> Private browsing or blocked storage means they are lost
            when the tab closes. Export each draft to keep it.
          </p>
        ) : (
          <p>
            Saved in this browser ({storageKind === "indexeddb" ? "IndexedDB" : "localStorage"}). No account. Safari can
            clear site data after a week without a visit unless the page is added to the Home Screen, so export a JSON
            backup of anything you care about.
          </p>
        )}
        <button type="button" className="btn" data-testid="restore-samples" disabled={busy} onClick={onRestoreSamples}>
          Restore missing sample drafts
        </button>
      </div>
    </section>
  );
}
