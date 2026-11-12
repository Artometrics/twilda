import type { DocSummary } from "../model";
import type { KeyValueStore } from "../backend/persistent";

export function ArticleList({
  documents,
  activeId,
  storageKind,
  busy,
  onOpen,
  onNew,
  onImport,
  onRestoreSamples,
}: {
  documents: DocSummary[];
  activeId: string | null;
  storageKind: KeyValueStore["kind"];
  busy: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: (file: File) => void;
  onRestoreSamples: () => void;
}) {
  return (
    <section className="pane pane-list" aria-label="Documents">
      <header className="pane-head">
        <h2>Documents</h2>
        <p>Drafts live on this device. Nothing is published until you export it or publish it.</p>
      </header>
      <div className="list-actions">
        <button type="button" className="btn btn-primary" data-testid="new-article" disabled={busy} onClick={onNew}>
          New article
        </button>
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
      {documents.length === 0 ? (
        <p className="empty">No documents yet. Start a new article, or import one.</p>
      ) : (
        <ul className="index">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className={doc.id === activeId ? "index-row is-active" : "index-row"}
                data-testid={`doc-${doc.id}`}
                aria-current={doc.id === activeId ? "true" : undefined}
                onClick={() => onOpen(doc.id)}
              >
                <span className="kicker">{doc.kicker || (doc.kind === "page" ? "Page" : "Article")}</span>
                <span className="index-title">{doc.title}</span>
                <span className="dek">{doc.dek}</span>
                <span className="badges">
                  <span className="badge">Draft</span>
                  {doc.hasPublished ? (
                    <span className="badge badge-live">Published</span>
                  ) : (
                    <span className="badge">Not published</span>
                  )}
                  {doc.status === "unpublished" ? (
                    <span className="badge badge-diff">Unpublished changes</span>
                  ) : null}
                  {doc.verifyCount > 0 ? (
                    <span className="badge badge-diff" data-testid={`verify-${doc.id}`}>
                      {doc.verifyCount} to verify
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="storage-note" data-testid="storage-note">
        {storageKind === "memory" ? (
          <p>
            <strong>This browser would not keep drafts.</strong> Private browsing or blocked storage means they are lost
            when the tab closes. Export each article to keep it.
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
