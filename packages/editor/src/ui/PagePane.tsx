import { useEffect, useRef, useState } from "react";
import type { TwildaDocument } from "@twilda/core";
import { mountOverlay, type OverlayHandle } from "@twilda/core/edit";
import type { Doc } from "../model";

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

/**
 * The draft in the real template. The HTML comes from the one renderer in
 * `@twilda/core`, so it is the markup the static site would build, plus
 * `data-twilda-ref` hooks. Text and images are edited where they sit through
 * the shared overlay. Edits are validated one field at a time and handed up
 * as a whole new document.
 */
export function PagePane({
  doc,
  plates,
  previewUrl,
  onEdit,
}: {
  doc: Doc;
  plates: string[];
  previewUrl: string | null;
  onEdit: (doc: Doc) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<OverlayHandle | null>(null);
  const docRef = useRef(doc);
  const onEditRef = useRef(onEdit);
  docRef.current = doc;
  onEditRef.current = onEdit;
  const [outlines, setOutlines] = useState(() => window.matchMedia("(hover: none)").matches);
  const [missing, setMissing] = useState(0);
  const id = doc.id;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const countMissing = () => setMissing(root.querySelectorAll(".plate-missing").length);
    const handle = mountOverlay({
      root,
      doc: docRef.current as TwildaDocument,
      media: plates,
      lenient: true,
      onChange: (next) => onEditRef.current(next as Doc),
      onRender: (scope) => {
        highlightVerify(scope);
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
  }, [id, plates]);

  useEffect(() => {
    handleRef.current?.setDoc(doc as TwildaDocument);
  }, [doc]);

  useEffect(() => {
    handleRef.current?.setOutlines(outlines);
  }, [outlines, id]);

  return (
    <section className="pane pane-page" aria-label="Page">
      <header className="page-bar">
        <p className="ribbon" data-testid="draft-ribbon">
          Draft · not live until published
        </p>
        <button
          type="button"
          className="btn btn-quiet"
          data-testid="outlines"
          aria-pressed={outlines}
          onClick={() => setOutlines((on) => !on)}
        >
          Outlines
        </button>
      </header>
      <p className="hint page-hint">Tap text to edit it where it sits. Tap an image to swap it. Saved to this device as you go.</p>
      {missing > 0 ? (
        <p className="note" data-testid="plate-note">
          {missing === 1 ? "One image shows" : `${missing} images show`} a placeholder: the template only prints repo plates from{" "}
          <code>/media</code>. Tap {missing === 1 ? "it" : "one"} to choose a plate.
        </p>
      ) : null}
      <div className="canvas">
        <div className="canvas-paper" data-testid="page-canvas" ref={rootRef} />
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
