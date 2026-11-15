import { useEffect, useRef, useState } from "react";
import { renderOptionsFor, themeVars, type SiteSettings, type TwildaDocument } from "@twilda/core";
import { mountOverlay, type MediaChoice, type OverlayHandle } from "@twilda/core/edit";
import type { Doc, MediaAsset } from "../model";

const VERIFY = /\[verify\b[^\]]*\]/gi;

/** Wrap each `[VERIFY ...]` note in a highlight so it cannot be missed. Text stays the same. */
export function highlightVerify(scope: HTMLElement): void {
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const hits: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (text.parentElement?.closest("mark.verify, [contenteditable]")) continue;
    VERIFY.lastIndex = 0;
    if (VERIFY.test(text.data)) hits.push(text);
  }
  for (const text of hits) {
    const fragment = document.createDocumentFragment();
    let last = 0;
    VERIFY.lastIndex = 0;
    for (let match = VERIFY.exec(text.data); match; match = VERIFY.exec(text.data)) {
      if (match.index > last) fragment.append(text.data.slice(last, match.index));
      const mark = document.createElement("mark");
      mark.className = "verify";
      mark.dataset.testid = "verify-mark";
      mark.setAttribute("data-testid", "verify-mark");
      mark.textContent = match[0];
      fragment.append(mark);
      last = match.index + match[0].length;
    }
    if (last < text.data.length) fragment.append(text.data.slice(last));
    text.replaceWith(fragment);
  }
}

/** Show an uploaded image from this device until the pull request that carries it is merged. */
export function swapLocalMedia(scope: HTMLElement, assets: readonly MediaAsset[]): void {
  if (assets.length === 0) return;
  const byName = new Map(assets.map((asset) => [asset.name, asset.dataUrl]));
  for (const img of scope.querySelectorAll<HTMLImageElement>("img[src^='/media/']")) {
    const name = (img.getAttribute("src") ?? "").slice("/media/".length);
    const local = byName.get(name);
    if (local?.startsWith("data:image/")) img.setAttribute("src", local);
  }
}

/**
 * The draft in the real template. The HTML comes from the one renderer in
 * `@twilda/core`, so it is the markup the static site would build, plus
 * `data-twilda-ref` hooks. Text (with bold, italic, and links), images, video,
 * and the order of sections are edited where they sit through the shared overlay.
 * Edits are validated one field at a time and handed up as a whole new document.
 * The masthead and theme come from the site settings, so this page is dressed the way
 * the page that ships will be.
 */
export function PagePane({
  doc,
  plates,
  media,
  site,
  previewUrl,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onEdit,
  onUploadImage,
}: {
  doc: Doc;
  plates: string[];
  media: readonly MediaAsset[];
  site: SiteSettings;
  previewUrl: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onEdit: (doc: Doc) => void;
  onUploadImage: (file: File) => Promise<MediaAsset | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<OverlayHandle | null>(null);
  const docRef = useRef(doc);
  const onEditRef = useRef(onEdit);
  const uploadRef = useRef(onUploadImage);
  const mediaRef = useRef(media);
  const siteRef = useRef(site);
  docRef.current = doc;
  onEditRef.current = onEdit;
  uploadRef.current = onUploadImage;
  mediaRef.current = media;
  siteRef.current = site;
  const [outlines, setOutlines] = useState(() => window.matchMedia("(hover: none)").matches);
  const [structure, setStructure] = useState(false);
  const [missing, setMissing] = useState(0);
  const id = doc.id;

  const choices = (): MediaChoice[] => {
    const local = mediaRef.current.map((asset) => ({ src: `/${asset.path}`, thumb: asset.dataUrl }));
    const taken = new Set(local.map((item) => item.src));
    return [...plates.filter((src) => !taken.has(src)).map((src) => ({ src })), ...local];
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const countMissing = () => setMissing(root.querySelectorAll(".plate-missing").length);
    const handle = mountOverlay({
      root,
      doc: docRef.current as TwildaDocument,
      media: choices(),
      render: renderOptionsFor(siteRef.current, docRef.current),
      lenient: true,
      structure,
      onUploadImage: async (file) => {
        const asset = await uploadRef.current(file);
        if (!asset) throw new Error("That image could not be used.");
        mediaRef.current = [...mediaRef.current.filter((item) => item.path !== asset.path), asset];
        return { src: `/${asset.path}`, thumb: asset.dataUrl };
      },
      onChange: (next) => onEditRef.current(next as Doc),
      onRender: (scope) => {
        highlightVerify(scope);
        swapLocalMedia(scope, mediaRef.current);
        countMissing();
      },
    });
    handleRef.current = handle;
    countMissing();
    return () => {
      handle.destroy();
      handleRef.current = null;
      root.replaceChildren();
    };
    // The overlay is rebuilt per document. Its other inputs are pushed in by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, plates]);

  useEffect(() => {
    handleRef.current?.setDoc(doc as TwildaDocument);
  }, [doc]);

  useEffect(() => {
    handleRef.current?.setMedia(choices());
    handleRef.current?.setRender(renderOptionsFor(siteRef.current, docRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media, plates]);

  const chromeKey = JSON.stringify(renderOptionsFor(site, doc));
  useEffect(() => {
    handleRef.current?.setRender(renderOptionsFor(siteRef.current, docRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chromeKey, id]);

  const varsKey = JSON.stringify(site.theme);
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    for (const [name, value] of Object.entries(themeVars(siteRef.current.theme))) paper.style.setProperty(name, value);
  }, [varsKey, id]);

  useEffect(() => {
    handleRef.current?.setOutlines(outlines);
  }, [outlines, id]);

  useEffect(() => {
    handleRef.current?.setStructure(structure);
  }, [structure, id]);

  return (
    <section className="pane pane-page" aria-label="Page">
      <header className="page-bar">
        <p className="ribbon" data-testid="draft-ribbon">
          Draft · not live until published
        </p>
        <div className="page-tools">
          <button type="button" className="btn btn-quiet" data-testid="undo" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
            Undo
          </button>
          <button type="button" className="btn btn-quiet" data-testid="redo" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
            Redo
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            data-testid="structure"
            aria-pressed={structure}
            onClick={() => setStructure((on) => !on)}
          >
            {doc.kind === "page" ? "Sections" : "Blocks"}
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            data-testid="outlines"
            aria-pressed={outlines}
            onClick={() => setOutlines((on) => !on)}
          >
            Outlines
          </button>
        </div>
      </header>
      <p className="hint page-hint">
        Tap text to edit it where it sits. Tap an image or video to swap it. Turn on {doc.kind === "page" ? "Sections" : "Blocks"} to move,
        copy, remove, or add. Saved to this device as you go.
      </p>
      {missing > 0 ? (
        <p className="note" data-testid="plate-note">
          {missing === 1 ? "One image shows" : `${missing} images show`} a placeholder: the template only prints images from{" "}
          <code>/media</code>. Tap {missing === 1 ? "it" : "one"} to choose a plate or upload a photo.
        </p>
      ) : null}
      <div className="canvas">
        <div className="canvas-paper" data-testid="page-canvas" ref={paperRef}>
          <div ref={rootRef} />
        </div>
      </div>
      {previewUrl ? (
        <div className="site-preview">
          <h3>Site preview</h3>
          <p className="hint">This frame does not show edits until they are published and the site is rebuilt.</p>
          <iframe data-testid="preview-iframe" title="Site preview" src={previewUrl} />
        </div>
      ) : (
        <p className="hint pad" data-testid="preview-iframe-missing">
          No site preview is connected. The page above is this draft as the static template would print it.
        </p>
      )}
    </section>
  );
}
