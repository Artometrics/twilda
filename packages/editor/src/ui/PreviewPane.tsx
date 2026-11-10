import type { Block, Doc, MediaAsset } from "../model";

export function PreviewPane({
  doc,
  media,
  previewUrl,
}: {
  doc: Doc;
  media: MediaAsset[];
  previewUrl: string | null;
}) {
  return (
    <section className="pane pane-preview" aria-label="Preview">
      <header className="pane-head">
        <h2>Preview</h2>
        <p>The proof is this draft, including unsaved edits. The frame is the URL from the backend.</p>
      </header>
      <article className="proof" data-testid="preview-fallback">
        <p className="kicker">{doc.kicker}</p>
        <h3 className="proof-title">{doc.title}</h3>
        {doc.dek ? <p className="dek proof-dek">{doc.dek}</p> : null}
        {doc.byline ? <p className="byline">{doc.byline}</p> : null}
        {doc.kind === "article" ? <ArticleProof blocks={doc.blocks} media={media} /> : <PageProof doc={doc} />}
      </article>
      {previewUrl ? (
        <div className="site-preview">
          <h3>Site preview</h3>
          <p className="hint">This frame does not show edits until they are published and the site is rebuilt.</p>
          <iframe data-testid="preview-iframe" title="Site preview" src={previewUrl} />
        </div>
      ) : (
        <p className="hint" data-testid="preview-iframe-missing">
          The backend did not provide a preview URL. The draft proof above is the fallback.
        </p>
      )}
    </section>
  );
}

function ArticleProof({ blocks, media }: { blocks: Block[]; media: MediaAsset[] }) {
  return (
    <div className="proof-body">
      {blocks.map((block) => (
        <BlockProof key={block.id} block={block} media={media} />
      ))}
    </div>
  );
}

function BlockProof({ block, media }: { block: Block; media: MediaAsset[] }) {
  switch (block.type) {
    case "heading":
      return block.level === 3 ? <h5>{block.text}</h5> : <h4>{block.text}</h4>;
    case "paragraph":
      return (
        <>
          {block.text.split(/\n\n+/).map((paragraph, index) => (
            <p key={`${block.id}-${index}`}>{paragraph}</p>
          ))}
        </>
      );
    case "key-findings":
      return (
        <section className="findings">
          <h4>{block.title}</h4>
          <dl>
            {block.findings.map((finding) => (
              <div key={finding.id}>
                <dt>{finding.label}</dt>
                <dd>{finding.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "chart":
      return (
        <figure className="chart">
          <div className="chart-bars" aria-hidden="true">
            <span style={{ height: "42%" }} />
            <span style={{ height: "74%" }} />
            <span style={{ height: "58%" }} />
            <span style={{ height: "36%" }} />
          </div>
          <figcaption>
            <strong>{block.title}</strong>
            {block.caption ? ` ${block.caption}` : ""}
          </figcaption>
        </figure>
      );
    case "callout":
      return (
        <aside className="callout">
          <strong>{block.title}</strong>
          <p>{block.text}</p>
        </aside>
      );
    case "sources":
      return (
        <section>
          <h4>Sources</h4>
          <ul>
            {block.items.map((item) => (
              <li key={item.id}>
                {item.href ? <a href={item.href}>{item.label}</a> : item.label}
              </li>
            ))}
          </ul>
        </section>
      );
    case "image": {
      const src = resolveMedia(media, block.src);
      return (
        <figure>
          {src ? <img src={src} alt={block.alt} /> : <p className="hint">No image file attached.</p>}
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case "video": {
      const src = resolveMedia(media, block.src);
      return (
        <figure>
          {src ? <video controls src={src} /> : <p className="hint">No video file attached.</p>}
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case "audio": {
      const src = resolveMedia(media, block.src);
      return (
        <figure>
          {src ? <audio controls src={src} /> : <p className="hint">No audio file attached.</p>}
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case "download":
      return (
        <p className="download">
          {block.href ? <a href={block.href}>{block.label || "Download"}</a> : block.label || "Download"}
        </p>
      );
    default: {
      const exhaustive: never = block;
      throw new Error(`Unknown block ${String(exhaustive)}`);
    }
  }
}

function PageProof({ doc }: { doc: Extract<Doc, { kind: "page" }> }) {
  return (
    <div className="proof-body">
      {doc.sections.map((section) => (
        <section key={section.id} className="page-section">
          <p className="kicker">{section.type}</p>
          <h4>{section.label}</h4>
          <p>{section.summary}</p>
        </section>
      ))}
    </div>
  );
}

function resolveMedia(media: MediaAsset[], src: string): string | null {
  if (!src) return null;
  const match = media.find((item) => item.path === src);
  if (match) return match.dataUrl;
  if (src.startsWith("data:") || src.startsWith("/") || src.startsWith("http")) return src;
  return null;
}
