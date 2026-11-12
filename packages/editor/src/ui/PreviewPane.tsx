import { Fragment } from "react";
import { safeHref } from "../export/mdx";
import type { Block, Doc, MediaAsset } from "../model";

const VERIFY = /(\[verify\b[^\]]*\])/gi;

/** Plain text with any [VERIFY ...] note picked out so it cannot be missed. */
export function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split(VERIFY).map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="verify" data-testid="verify-mark">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

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
        <p>The proof is this draft as the reader would meet it, including unsaved edits.</p>
      </header>
      <article className="proof" data-testid="preview-fallback">
        <p className="ribbon" data-testid="draft-ribbon">
          Draft proof
        </p>
        <p className="kicker">{doc.kicker}</p>
        <h3 className="proof-title" data-testid="proof-title">
          <Marked text={doc.title} />
        </h3>
        {doc.dek ? (
          <p className="dek proof-dek">
            <Marked text={doc.dek} />
          </p>
        ) : null}
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
          No site preview is connected. The proof above is the page as this draft would read.
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
      return block.level === 3 ? (
        <h5>
          <Marked text={block.text} />
        </h5>
      ) : (
        <h4>
          <Marked text={block.text} />
        </h4>
      );
    case "paragraph":
      return (
        <>
          {block.text.split(/\n\n+/).map((paragraph, index) => (
            <p key={`${block.id}-${index}`}>
              <Marked text={paragraph} />
            </p>
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
                <dt>
                  <Marked text={finding.label} />
                </dt>
                <dd>
                  <Marked text={finding.detail} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "chart": {
      const link = safeHref(block.src);
      const isImage = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(link);
      return (
        <figure className="chart">
          {isImage ? (
            <img src={link} alt={block.alt} />
          ) : (
            <div className="chart-bars" role="img" aria-label={block.alt || "Chart placeholder"}>
              <span style={{ height: "42%" }} />
              <span style={{ height: "74%" }} />
              <span style={{ height: "58%" }} />
              <span style={{ height: "36%" }} />
            </div>
          )}
          <figcaption>
            <strong>{block.title}</strong>
            {block.caption ? (
              <>
                {" "}
                <Marked text={block.caption} />
              </>
            ) : null}
            {link ? (
              <>
                {" "}
                <a href={link} target="_blank" rel="noreferrer noopener">
                  Open the chart
                </a>
              </>
            ) : (
              <span className="hint"> No chart link yet.</span>
            )}
          </figcaption>
        </figure>
      );
    }
    case "callout":
      return (
        <aside className="callout">
          <strong>
            <Marked text={block.title} />
          </strong>
          <p>
            <Marked text={block.text} />
          </p>
        </aside>
      );
    case "sources":
      return (
        <section>
          <h4>Sources</h4>
          <ol className="sources">
            {block.items.map((item) => {
              const href = safeHref(item.href);
              return (
                <li key={item.id}>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer noopener">
                      <Marked text={item.label || item.href} />
                    </a>
                  ) : (
                    <Marked text={item.label || item.href} />
                  )}
                </li>
              );
            })}
          </ol>
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
          {safeHref(block.href) ? (
            <a href={safeHref(block.href)} target="_blank" rel="noreferrer noopener">
              {block.label || "Download"}
            </a>
          ) : (
            block.label || "Download"
          )}
          {block.description ? <span className="hint"> {block.description}</span> : null}
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
  if (src.startsWith("data:image/") || src.startsWith("/") || /^https?:\/\//.test(src)) return src;
  return null;
}
