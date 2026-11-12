import { useMemo, useState } from "react";
import { checkArticle } from "../export/check";
import { createBundle } from "../export/bundle";
import { exportArticle, exportJson, type Flavor } from "../export/mdx";
import type { Doc, MediaAsset } from "../model";

function saveBlob(filename: string, data: BlobPart, type: string): void {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ExportPanel({
  doc,
  media,
  dirty,
  onNotice,
  onFailure,
}: {
  doc: Doc;
  media: MediaAsset[];
  dirty: boolean;
  onNotice: (message: string) => void;
  onFailure: (message: string) => void;
}) {
  const [flavor, setFlavor] = useState<Flavor>("mdx");
  const [draftFlag, setDraftFlag] = useState(true);
  const article = doc.kind === "article" ? doc : null;

  const exported = useMemo(
    () => (article ? exportArticle(article, { flavor, media, draft: draftFlag }) : null),
    [article, flavor, media, draftFlag],
  );
  const issues = useMemo(() => (article ? checkArticle(article) : []), [article]);
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    exported !== null &&
    navigator.canShare({ files: [new File([exported.text], exported.filename, { type: "text/plain" })] });

  async function copy() {
    if (!exported) return;
    try {
      await navigator.clipboard.writeText(exported.text);
      onNotice(`Copied ${exported.filename} to the clipboard.`);
    } catch {
      onFailure("This browser would not copy to the clipboard. Use Download instead.");
    }
  }

  async function share() {
    if (!exported) return;
    try {
      const file = new File([exported.text], exported.filename, { type: "text/plain" });
      await navigator.share({ files: [file], title: doc.title });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      onFailure("Sharing did not work here. Use Download instead.");
    }
  }

  function downloadText() {
    if (!exported) return;
    saveBlob(exported.filename, exported.text, "text/plain;charset=utf-8");
    onNotice(`Downloaded ${exported.filename}.`);
  }

  function downloadJson() {
    saveBlob(`${doc.slug}.json`, exportJson(doc), "application/json");
    onNotice(`Downloaded ${doc.slug}.json. Import it later to restore this draft.`);
  }

  function downloadBundle() {
    if (!article) return;
    const bundle = createBundle(article, media, { draft: draftFlag });
    saveBlob(bundle.filename, bundle.bytes as BlobPart, "application/zip");
    onNotice(`Downloaded ${bundle.filename}: MDX, Markdown, JSON and any images.`);
  }

  return (
    <section className="pane pane-export" aria-label="Export">
      <header className="pane-head">
        <h2>Export</h2>
        <p>
          {article
            ? "Astro-ready Markdown or MDX with frontmatter. This is what is on screen, including unsaved edits."
            : "Pages are saved as JSON. Markdown and MDX export is for articles."}
        </p>
      </header>

      {dirty ? (
        <p className="hint pad" data-testid="export-dirty">
          You have edits that are not saved yet. The export includes them.
        </p>
      ) : null}

      {article && exported ? (
        <>
          <div className="segmented" role="group" aria-label="Format">
            <button
              type="button"
              data-testid="flavor-mdx"
              aria-pressed={flavor === "mdx"}
              onClick={() => setFlavor("mdx")}
            >
              MDX
            </button>
            <button
              type="button"
              data-testid="flavor-md"
              aria-pressed={flavor === "md"}
              onClick={() => setFlavor("md")}
            >
              Markdown
            </button>
          </div>
          <label className="check">
            <input
              type="checkbox"
              data-testid="draft-flag"
              checked={draftFlag}
              onChange={(event) => setDraftFlag(event.target.checked)}
            />
            <span>
              Mark as <code>draft: true</code> in the frontmatter
            </span>
          </label>

          <div className="issues" data-testid="export-issues">
            <h3>Before it leaves this phone</h3>
            {issues.length === 0 ? (
              <p className="ok" data-testid="export-clean">
                No problems found.
              </p>
            ) : (
              <ul>
                {issues.map((issue, index) => (
                  <li key={`${issue.message}-${index}`} className={issue.level === "error" ? "issue-error" : "issue-warn"}>
                    <strong>{issue.level === "error" ? "Fix" : "Check"}:</strong> {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="export-actions">
            <button type="button" className="btn btn-primary" data-testid="download-text" onClick={downloadText}>
              Download {exported.filename}
            </button>
            <button type="button" className="btn" data-testid="download-bundle" onClick={downloadBundle}>
              Download bundle (.zip)
            </button>
            <button type="button" className="btn" data-testid="download-json" onClick={downloadJson}>
              Download JSON backup
            </button>
            <button type="button" className="btn" data-testid="copy-text" onClick={() => void copy()}>
              Copy to clipboard
            </button>
            {canShare ? (
              <button type="button" className="btn" data-testid="share-text" onClick={() => void share()}>
                Share…
              </button>
            ) : null}
          </div>

          {exported.images.length > 0 ? (
            <p className="hint pad">
              {exported.images.length === 1 ? "1 uploaded image goes" : `${exported.images.length} uploaded images go`} in
              the bundle under images/. A single {flavor === "mdx" ? ".mdx" : ".md"} file refers to them as ./images/…
            </p>
          ) : null}

          <h3 className="pad">{exported.filename}</h3>
          <pre className="export-text" data-testid="export-text" tabIndex={0}>
            {exported.text}
          </pre>
          {flavor === "mdx" ? (
            <p className="hint pad">
              The MDX uses Callout, Chart, Download and KeyFindings components. Copy the Astro components from{" "}
              <code>packages/editor/astro-kit</code> into <code>src/components/twilda/</code>, or export Markdown for a
              file that needs none.
            </p>
          ) : null}
        </>
      ) : (
        <div className="export-actions">
          <button type="button" className="btn btn-primary" data-testid="download-json" onClick={downloadJson}>
            Download JSON backup
          </button>
        </div>
      )}
    </section>
  );
}
