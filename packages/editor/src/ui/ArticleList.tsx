import type { DocSummary } from "../model";

export function ArticleList({
  documents,
  activeId,
  onOpen,
}: {
  documents: DocSummary[];
  activeId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="pane pane-list" aria-label="Documents">
      <header className="pane-head">
        <h2>Documents</h2>
        <p>Draft and published are separate files. A badge is the state of each.</p>
      </header>
      {documents.length === 0 ? (
        <p className="empty">No documents yet.</p>
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
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
