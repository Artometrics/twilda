import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import "@fontsource/newsreader/500.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import type { TwildaEditorApi } from "../../../packages/core/src/editor-api";
import { TwildaError } from "../../../packages/core/src/errors";
import { BLOCK_LABELS, BLOCK_TYPES, SECTION_LABELS, type Block, type BlockType, type PageSection, type PageSectionType, type TwildaDocument } from "../../../packages/core/src/schema";
import { openBrowserDemo } from "../../../packages/core/src/browser-demo";

type View = "edit" | "media" | "preview" | "publish";

function nid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function blankBlock(type: BlockType): Block {
  switch (type) {
    case "heading":
      return { id: nid("heading"), type, level: 2, text: "New heading" };
    case "paragraph":
      return { id: nid("paragraph"), type, text: "New paragraph." };
    case "key-findings":
      return { id: nid("findings"), type, title: "Key findings", items: ["First finding"] };
    case "chart":
      return {
        id: nid("chart"),
        type,
        dataPath: "content/data/franchise-revenue-mix.csv",
        alt: "Describe the chart.",
        title: "Chart",
        caption: "",
      };
    case "callout":
      return { id: nid("callout"), type, title: "Note", text: "A short note." };
    case "sources":
      return { id: nid("sources"), type, title: "Sources", items: [{ id: nid("source"), label: "Source", href: "https://artometrics.com/" }] };
    case "image":
      return { id: nid("image"), type, src: "/media/plate-franchise.svg", alt: "Describe the image.", caption: "", role: "figure" };
    case "embed":
      return { id: nid("embed"), type, kind: "audio", src: "https://artometrics.com/franchise", title: "Audio", caption: "" };
    case "download":
      return { id: nid("download"), type, href: "/data/franchise-revenue-mix.csv", label: "Download", description: "" };
    default: {
      const exhaustive: never = type;
      throw new Error(exhaustive);
    }
  }
}

function blankSection(type: PageSectionType): PageSection {
  if (type === "carousel") {
    return {
      id: nid("carousel"),
      type,
      label: "Stories",
      slides: [
        {
          id: nid("slide"),
          kicker: "Story",
          title: "New slide",
          dek: "",
          href: "/articles/franchise",
          image: "/media/plate-franchise.svg",
          imageAlt: "Demo plate",
        },
      ],
    };
  }
  if (type === "story-grid") {
    return {
      id: nid("grid"),
      type,
      kicker: "Desk",
      heading: "Stories",
      stories: [
        {
          id: nid("story"),
          kicker: "Story",
          title: "New story",
          dek: "",
          href: "/articles/franchise",
          image: "/media/plate-franchise.svg",
          imageAlt: "Demo plate",
        },
      ],
    };
  }
  return {
    id: nid("shelf"),
    type: "menu-shelf",
    heading: "Menu",
    items: [{ id: nid("item"), label: "Arts", href: "/topics/arts", dek: "" }],
  };
}

function messageOf(error: unknown): string {
  if (error instanceof TwildaError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something failed.";
}

export function App() {
  const [api, setApi] = useState<TwildaEditorApi | null>(null);
  const [docs, setDocs] = useState<Awaited<ReturnType<TwildaEditorApi["listDocuments"]>>>([]);
  const [doc, setDoc] = useState<TwildaDocument | null>(null);
  const [view, setView] = useState<View>("edit");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState("");
  const [previewSource, setPreviewSource] = useState<"draft" | "published">("draft");
  const [history, setHistory] = useState<Awaited<ReturnType<TwildaEditorApi["listHistory"]>>>([]);
  const [busy, setBusy] = useState(false);

  async function refreshList(client: TwildaEditorApi) {
    setDocs(await client.listDocuments());
  }

  useEffect(() => {
    let cancelled = false;
    openBrowserDemo()
      .then(async ({ api: client }) => {
        if (cancelled) return;
        setApi(client);
        setDocs(await client.listDocuments());
      })
      .catch((caught: unknown) => setError(messageOf(caught)));
    return () => {
      cancelled = true;
    };
  }, []);

  async function openDoc(id: string) {
    if (!api) return;
    setError("");
    setStatus("");
    const next = await api.readDocument(id, "draft");
    setDoc(next);
    setView("edit");
  }

  async function save() {
    if (!api || !doc) return;
    setBusy(true);
    setError("");
    try {
      const saved = await api.saveDraft(doc);
      setDoc(saved);
      setStatus("Draft saved in this browser. The published copy did not change.");
      await refreshList(api);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function loadPreview(source: "draft" | "published") {
    if (!api || !doc) return;
    setPreviewSource(source);
    setError("");
    try {
      if (source === "draft") await api.saveDraft(doc);
      setPreview(await api.previewHtml(doc.id, source));
      await refreshList(api);
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  async function publish() {
    if (!api || !doc) return;
    setBusy(true);
    setError("");
    try {
      await api.saveDraft(doc);
      const result = await api.publish(doc.id);
      setDoc(result.document);
      setStatus(`Published by merging ${result.pullRequest.url}. This demo merge is local, not GitHub.`);
      setHistory(await api.listHistory(doc.id));
      await refreshList(api);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function rollback() {
    if (!api || !doc) return;
    setBusy(true);
    setError("");
    try {
      const restored = await api.rollback(doc.id);
      setDoc(restored);
      setStatus("Rolled back to the previous published copy.");
      setHistory(await api.listHistory(doc.id));
      await refreshList(api);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!api) return;
    setBusy(true);
    setError("");
    try {
      await api.resetSample();
      setDoc(null);
      setPreview("");
      setStatus("Sample content restored in this browser.");
      await refreshList(api);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File | undefined) {
    if (!api || !doc || !file) return;
    setBusy(true);
    setError("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const uploaded = await api.uploadMedia({
        documentId: doc.id,
        filename: file.name,
        mediaType: file.type || "application/octet-stream",
        bytesBase64: btoa(binary),
      });
      setDoc((current) => {
        if (!current || current.kind !== "article") return current;
        return {
          ...current,
          blocks: [
            ...current.blocks,
            {
              id: nid("upload"),
              type: "image",
              src: uploaded.src,
              alt: file.name,
              caption: "Uploaded in this browser.",
              role: "figure",
            },
          ],
        };
      });
      setStatus("Image stored with the draft.");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="bar">
        {doc ? (
          <button type="button" className="ghost" onClick={() => setDoc(null)}>
            Documents
          </button>
        ) : (
          <p className="kicker">Twilda</p>
        )}
        {doc ? (
          <button type="button" className="primary" data-testid="save-draft" disabled={busy} onClick={() => void save()}>
            Save draft
          </button>
        ) : null}
      </header>
      {!doc ? <h1>Twilda</h1> : <h1>{doc.title}</h1>}
      <p className="note">Browser demo. Drafts stay on this phone. Nothing here publishes artometrics.com or the production Twilda site.</p>
      {error ? (
        <p role="alert" data-testid="error">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="ok" data-testid="status">
          {status}
        </p>
      ) : null}

      {!api ? <p>Opening the sample…</p> : null}

      {api && !doc ? (
        <section>
          <ul>
            {docs.map((item) => (
              <li key={item.id}>
                <button type="button" className="card" data-testid={`doc-${item.id}`} onClick={() => void openDoc(item.id)}>
                  <span className="muted">{item.kind}</span>
                  <strong>{item.title}</strong>
                  <span>{item.hasUnpublishedChanges ? "Unpublished changes" : "Matches published"}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="ghost" data-testid="reset-sample" disabled={busy} onClick={() => void reset()}>
            Reset to sample content
          </button>
        </section>
      ) : null}

      {doc && view === "edit" ? <Editor doc={doc} setDoc={setDoc} /> : null}
      {doc && view === "media" ? (
        <section className="panel">
          <h2>Media</h2>
          <p className="note">PNG, JPEG, WEBP, GIF, or SVG under 1.5 MB. The file stays in this browser’s draft.</p>
          <label className="file ghost">
            Choose image
            <input data-testid="upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={(event) => void onUpload(event.target.files?.[0])} />
          </label>
        </section>
      ) : null}
      {doc && view === "preview" ? (
        <section>
          <div className="actions">
            <button type="button" data-testid="preview-draft" aria-current={previewSource === "draft" ? "page" : undefined} onClick={() => void loadPreview("draft")}>
              Draft preview
            </button>
            <button type="button" data-testid="preview-published" onClick={() => void loadPreview("published")}>
              Published preview
            </button>
          </div>
          <p className="note">This preview is rendered here from saved documents. The static /preview folder is the built sample and does not change until the next build.</p>
          {preview ? <iframe key={`${previewSource}-${preview.length}`} className="preview" data-testid="preview-frame" title="Preview" srcDoc={preview} /> : <p>Choose a preview.</p>}
        </section>
      ) : null}
      {doc && view === "publish" ? (
        <section className="panel">
          <h2>Publish</h2>
          <p className="note">Publish opens a pull request from twilda/draft/{doc.id} and merges it into the demo’s main branch. Rollback restores the previous published file.</p>
          <div className="actions">
            <button type="button" className="primary" data-testid="publish-button" disabled={busy} onClick={() => void publish()}>
              Publish
            </button>
            <button type="button" className="danger" data-testid="rollback-button" disabled={busy} onClick={() => void rollback()}>
              Roll back
            </button>
            <button type="button" className="ghost" onClick={() => void api?.listHistory(doc.id).then(setHistory).catch((caught: unknown) => setError(messageOf(caught)))}>
              Show history
            </button>
          </div>
          <ul>
            {history.map((entry) => (
              <li key={entry.at}>
                {entry.at}: {entry.message}
              </li>
            ))}
          </ul>
          <GitHubPanel />
        </section>
      ) : null}

      {doc ? (
        <nav className="tabs">
          {(["edit", "media", "preview", "publish"] as const).map((item) => (
            <button key={item} type="button" data-testid={`tab-${item}`} aria-current={view === item ? "page" : undefined} onClick={() => setView(item)}>
              {item[0].toUpperCase()}
              {item.slice(1)}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function Editor({ doc, setDoc }: { doc: TwildaDocument; setDoc: Dispatch<SetStateAction<TwildaDocument | null>> }) {
  if (doc.kind === "article") {
    return (
      <section>
        <label>
          Title
          <input data-testid="field-title" value={doc.title} onChange={(event) => setDoc({ ...doc, title: event.target.value })} />
        </label>
        <label>
          Dek
          <textarea value={doc.dek} onChange={(event) => setDoc({ ...doc, dek: event.target.value })} />
        </label>
        {doc.blocks.map((block, index) => (
          <article className="block" key={block.id} data-testid={`block-${block.id}`}>
            <div className="row">
              <Handle
                id={block.id}
                index={index}
                count={doc.blocks.length}
                onMove={(from, to) =>
                  setDoc((current) => {
                    if (!current || current.kind !== "article") return current;
                    const blocks = current.blocks.slice();
                    const [item] = blocks.splice(from, 1);
                    if (!item) return current;
                    blocks.splice(to, 0, item);
                    return { ...current, blocks };
                  })
                }
              />
              <div className="fields">
                <strong>{BLOCK_LABELS[block.type]}</strong>
                <BlockFields block={block} onChange={(next) => setDoc({ ...doc, blocks: doc.blocks.map((item) => (item.id === block.id ? next : item)) })} />
                <button type="button" className="danger" onClick={() => setDoc({ ...doc, blocks: doc.blocks.filter((item) => item.id !== block.id) })}>
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
        <div className="adds">
          {BLOCK_TYPES.map((type) => (
            <button key={type} type="button" className="ghost" onClick={() => setDoc({ ...doc, blocks: [...doc.blocks, blankBlock(type)] })}>
              {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section>
      <label>
        Title
        <input data-testid="field-title" value={doc.title} onChange={(event) => setDoc({ ...doc, title: event.target.value })} />
      </label>
      {doc.sections.map((section, index) => (
        <article className="block" key={section.id}>
          <div className="row">
            <Handle
              id={section.id}
              index={index}
              count={doc.sections.length}
              onMove={(from, to) =>
                setDoc((current) => {
                  if (!current || current.kind !== "page") return current;
                  const sections = current.sections.slice();
                  const [item] = sections.splice(from, 1);
                  if (!item) return current;
                  sections.splice(to, 0, item);
                  return { ...current, sections };
                })
              }
            />
            <div className="fields">
              <strong>{SECTION_LABELS[section.type]}</strong>
              <SectionFields section={section} onChange={(next) => setDoc({ ...doc, sections: doc.sections.map((item) => (item.id === section.id ? next : item)) })} />
              <button type="button" className="danger" onClick={() => setDoc({ ...doc, sections: doc.sections.filter((item) => item.id !== section.id) })}>
                Remove
              </button>
            </div>
          </div>
        </article>
      ))}
      <div className="adds">
        {(Object.keys(SECTION_LABELS) as PageSectionType[]).map((type) => (
          <button key={type} type="button" className="ghost" onClick={() => setDoc({ ...doc, sections: [...doc.sections, blankSection(type)] })}>
            {SECTION_LABELS[type]}
          </button>
        ))}
      </div>
    </section>
  );
}

function Handle({ id, index, count, onMove }: { id: string; index: number; count: number; onMove: (from: number, to: number) => void }) {
  const indexRef = useRef(index);
  const countRef = useRef(count);
  indexRef.current = index;
  countRef.current = count;
  return (
    <button
      type="button"
      className="handle"
      data-testid={`handle-${id}`}
      aria-label={`Reorder ${id}`}
      onPointerDown={(event) => {
        event.preventDefault();
        let origin = event.clientY;
        const move = (ev: PointerEvent) => {
          const dy = ev.clientY - origin;
          const current = indexRef.current;
          if (dy > 28 && current < countRef.current - 1) {
            onMove(current, current + 1);
            indexRef.current = current + 1;
            origin = ev.clientY;
          } else if (dy < -28 && current > 0) {
            onMove(current, current - 1);
            indexRef.current = current - 1;
            origin = ev.clientY;
          }
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
    >
      Drag
    </button>
  );
}

function BlockFields({ block, onChange }: { block: Block; onChange: (block: Block) => void }) {
  if (block.type === "heading") {
    return (
      <>
        <select value={block.level} onChange={(event) => onChange({ ...block, level: Number(event.target.value) === 3 ? 3 : 2 })}>
          <option value={2}>Heading 2</option>
          <option value={3}>Heading 3</option>
        </select>
        <textarea data-testid={`field-${block.id}-text`} value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
      </>
    );
  }
  if (block.type === "paragraph" || block.type === "callout") {
    return (
      <>
        {block.type === "callout" ? <input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} /> : null}
        <textarea data-testid={`field-${block.id}-text`} value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
      </>
    );
  }
  if (block.type === "key-findings") {
    return (
      <>
        <input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} />
        {block.items.map((item, index) => (
          <textarea key={index} value={item} onChange={(event) => onChange({ ...block, items: block.items.map((entry, itemIndex) => (itemIndex === index ? event.target.value : entry)) })} />
        ))}
      </>
    );
  }
  if (block.type === "chart") {
    return (
      <>
        <input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} />
        <textarea data-testid={`field-${block.id}-text`} value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} />
        <input value={block.dataPath} onChange={(event) => onChange({ ...block, dataPath: event.target.value })} />
      </>
    );
  }
  if (block.type === "image") {
    return (
      <>
        <textarea data-testid={`field-${block.id}-text`} value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} />
        <select value={block.role} onChange={(event) => onChange({ ...block, role: event.target.value === "banner" ? "banner" : "figure" })}>
          <option value="banner">Banner</option>
          <option value="figure">Figure</option>
        </select>
      </>
    );
  }
  if (block.type === "embed") {
    return (
      <>
        <select value={block.kind} onChange={(event) => onChange({ ...block, kind: event.target.value === "video" ? "video" : "audio" })}>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
        </select>
        <input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} />
        <input value={block.src} onChange={(event) => onChange({ ...block, src: event.target.value })} />
      </>
    );
  }
  if (block.type === "sources") {
    return (
      <>
        <input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} />
        {block.items.map((item) => (
          <input key={item.id} value={item.label} onChange={(event) => onChange({ ...block, items: block.items.map((entry) => (entry.id === item.id ? { ...entry, label: event.target.value } : entry)) })} />
        ))}
      </>
    );
  }
  return (
    <>
      <input data-testid={`field-${block.id}-text`} value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} />
      <input value={block.href} onChange={(event) => onChange({ ...block, href: event.target.value })} />
    </>
  );
}

function SectionFields({ section, onChange }: { section: PageSection; onChange: (section: PageSection) => void }) {
  if (section.type === "carousel") {
    return (
      <>
        <input value={section.label} onChange={(event) => onChange({ ...section, label: event.target.value })} />
        {section.slides.map((slide) => (
          <input key={slide.id} value={slide.title} onChange={(event) => onChange({ ...section, slides: section.slides.map((item) => (item.id === slide.id ? { ...item, title: event.target.value } : item)) })} />
        ))}
      </>
    );
  }
  if (section.type === "story-grid") {
    return (
      <>
        <input value={section.heading} onChange={(event) => onChange({ ...section, heading: event.target.value })} />
        {section.stories.map((story) => (
          <input key={story.id} value={story.title} onChange={(event) => onChange({ ...section, stories: section.stories.map((item) => (item.id === story.id ? { ...item, title: event.target.value } : item)) })} />
        ))}
      </>
    );
  }
  return (
    <>
      <input value={section.heading} onChange={(event) => onChange({ ...section, heading: event.target.value })} />
      {section.items.map((item) => (
        <input key={item.id} value={item.label} onChange={(event) => onChange({ ...section, items: section.items.map((entry) => (entry.id === item.id ? { ...entry, label: event.target.value } : entry)) })} />
      ))}
    </>
  );
}

function GitHubPanel() {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState("");

  async function check() {
    setProblem("");
    setNote("");
    try {
      const { GitHubBackend } = await import("../../../packages/backend-github/src/index");
      const github = new GitHubBackend({ owner, repo, token });
      const drafts = await github.listDrafts();
      setNote(`GitHub answered. ${drafts.length} draft branch${drafts.length === 1 ? "" : "es"}. The token stayed in this tab’s memory.`);
    } catch (caught) {
      setProblem(messageOf(caught));
    }
  }

  async function start() {
    setProblem("");
    setNote("");
    try {
      const { startDeviceFlow } = await import("../../../packages/backend-github/src/index");
      const flow = await startDeviceFlow({ clientId });
      setDeviceCode(flow.deviceCode);
      setNote(`Open ${flow.verificationUri} and enter ${flow.userCode}. Then check approval. No client id is stored in the repo.`);
    } catch (caught) {
      setProblem(messageOf(caught));
    }
  }

  async function poll() {
    setProblem("");
    try {
      const { pollDeviceFlow } = await import("../../../packages/backend-github/src/index");
      const result = await pollDeviceFlow({ clientId, deviceCode });
      if (result.status === "ready" && result.accessToken) {
        setToken(result.accessToken);
        setNote("GitHub returned a token. It is in this tab’s memory only and is not written to the repo.");
      } else {
        setNote("GitHub is still waiting for approval.");
      }
    } catch (caught) {
      setProblem(messageOf(caught));
    }
  }

  return (
    <details>
      <summary>GitHub backend</summary>
      <p className="note">Optional. The phone demo does not use it. Create your own OAuth app or paste a fine-grained token. Do not commit either.</p>
      <label>
        Owner
        <input value={owner} onChange={(event) => setOwner(event.target.value)} autoComplete="off" />
      </label>
      <label>
        Repo
        <input value={repo} onChange={(event) => setRepo(event.target.value)} autoComplete="off" />
      </label>
      <label>
        Token
        <input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" />
      </label>
      <button type="button" className="ghost" onClick={() => void check()}>
        Check GitHub
      </button>
      <label>
        OAuth client id
        <input value={clientId} onChange={(event) => setClientId(event.target.value)} autoComplete="off" />
      </label>
      <div className="actions">
        <button type="button" className="ghost" onClick={() => void start()}>
          Start device sign-in
        </button>
        <button type="button" className="ghost" disabled={!deviceCode} onClick={() => void poll()}>
          Check approval
        </button>
      </div>
      {problem ? <p role="alert">{problem}</p> : null}
      {note ? <p className="ok">{note}</p> : null}
    </details>
  );
}
