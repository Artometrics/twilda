import { renderDocument, type RenderOptions } from "../render";
import type { TwildaDocument } from "../schema";
import { contentDigest } from "../serialize";
import { applyEdit, fieldLabel, getAtPath, normalizeMultiline, normalizeText } from "./doc-path";

/**
 * Click-on-the-page editing over the one renderer.
 *
 * The overlay renders the document with `annotate: true`, outlines the fields
 * that carry a `data-twilda-ref`, and edits them where they sit: text through
 * `contenteditable`, images through a small picker. Every commit goes through
 * the `@twilda/core` schema. Nothing here can add keys or change structure, so
 * a page cannot stop being a prepared page. The overlay owns no storage, no
 * publish step, and no toolbar: the host decides what to do with each change.
 */

export interface OverlayOptions {
  /** Element the template is rendered into. It gains `twilda-live` once mounted. */
  root: HTMLElement;
  /** Starting document. */
  doc: TwildaDocument;
  /** Repo images the picker offers, e.g. `/media/plate-map.svg`. */
  media: string[];
  /** Options passed to the renderer. `annotate` is always on. */
  render?: Omit<RenderOptions, "annotate">;
  /** Accept edits to a field when the rest of the draft is not yet schema-valid. */
  lenient?: boolean;
  /** Render the document into `root` on mount. Off when the server already did (and it matches). */
  renderOnMount?: boolean;
  /** Where the toast and the image sheet go. Default `document.body`. */
  host?: HTMLElement;
  /** Called after a validated edit. */
  onChange?: (doc: TwildaDocument, change: { ref: string }) => void;
  /** Called with a human message when an edit is refused. Default: an in-page toast. */
  onError?: (message: string) => void;
  /** Called with `root` after a full render and with an element after its text is restored. */
  onRender?: (scope: HTMLElement) => void;
}

export interface OverlayHandle {
  getDoc(): TwildaDocument;
  /** Replace the document, for example after a form edit elsewhere. Re-renders only if it differs. */
  setDoc(doc: TwildaDocument): void;
  setOutlines(on: boolean): void;
  hasOutlines(): boolean;
  /** Finish any text edit in progress. */
  commit(): void;
  /** Show a message in the overlay's toast (or send it to `onError`). */
  showError(message: string): void;
  destroy(): void;
}

type Child = Node | string | null | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  for (const child of children) if (child) el.append(child);
  return el;
}

const REF = "[data-twilda-ref]";

export function mountOverlay(options: OverlayOptions): OverlayHandle {
  const { root, media } = options;
  const host = options.host ?? document.body;
  let doc = options.doc;
  let editing: HTMLElement | null = null;
  let imageRef: { ref: string; altRef: string } | null = null;
  let toastTimer: number | undefined;

  const toast = h("p", { class: "twilda-toast", role: "alert", hidden: "" });
  const overlay = h("div", { class: "twilda-overlay", hidden: "", "aria-hidden": "true" }, h("span", { class: "twilda-chip" }));
  const chip = overlay.firstElementChild as HTMLElement;
  const imageSheet = buildImageSheet();
  host.append(toast, overlay, imageSheet.el);

  const renderHtml = (value: TwildaDocument) => renderDocument(value, { ...options.render, annotate: true });

  function showError(message: string) {
    if (options.onError) return options.onError(message);
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 5000);
  }

  function decorate(scope: HTMLElement) {
    for (const el of scope.matches(REF) ? [scope] : []) label(el);
    for (const el of scope.querySelectorAll<HTMLElement>(REF)) label(el);
    for (const a of scope.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      a.dataset.twildaHref = a.getAttribute("href") ?? "";
      a.removeAttribute("href");
    }
    options.onRender?.(scope);
  }

  function label(el: HTMLElement) {
    el.dataset.twildaLabel = fieldLabel(el.dataset.twildaRef ?? "");
    if (el.dataset.twildaType === "image") {
      el.setAttribute("role", el.tagName === "IMG" ? "button" : "img");
      el.setAttribute("tabindex", "0");
    }
  }

  function render() {
    root.innerHTML = renderHtml(doc);
    decorate(root);
  }

  /** Put one element back the way the template renders it, without replacing it in the DOM. */
  function restore(el: HTMLElement) {
    const ref = el.dataset.twildaRef ?? "";
    const scratch = document.createElement("div");
    scratch.innerHTML = renderHtml(doc);
    const fresh = [...scratch.querySelectorAll<HTMLElement>(REF)].find((node) => node.dataset.twildaRef === ref);
    if (fresh) el.innerHTML = fresh.innerHTML;
    decorate(el);
  }

  function positionOverlay(el: HTMLElement | null) {
    if (!el) {
      overlay.hidden = true;
      return;
    }
    const rect = el.getBoundingClientRect();
    const origin = host === document.body ? { top: window.scrollY, left: window.scrollX } : { top: 0, left: 0 };
    overlay.hidden = false;
    overlay.style.top = `${rect.top + origin.top}px`;
    overlay.style.left = `${rect.left + origin.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    chip.textContent = el.dataset.twildaType === "image" ? "Replace image" : `Edit ${el.dataset.twildaLabel ?? "text"}`;
    overlay.classList.toggle("twilda-flip", rect.top < 36);
  }

  function annotated(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? target.closest<HTMLElement>(REF) : null;
  }

  const listeners: Array<() => void> = [];
  function on(target: EventTarget, type: string, handler: (event: never) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, handler as EventListener, opts);
    listeners.push(() => target.removeEventListener(type, handler as EventListener, opts));
  }

  on(root, "pointerover", (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || editing) return;
    positionOverlay(annotated(event.target));
  });
  on(root, "pointerleave", () => {
    if (!editing) positionOverlay(null);
  });
  // Capture: the page may sit in a scrolling pane, and scroll events do not bubble.
  on(
    document,
    "scroll",
    () => {
      if (!editing) positionOverlay(null);
    },
    { capture: true, passive: true },
  );

  on(root, "click", (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    const el = annotated(event.target);
    if (link || el) event.preventDefault();
    if (!el) return commitText();
    if (el === editing) return;
    if (el.dataset.twildaType === "image") {
      commitText();
      openImage(el);
    } else {
      startText(el);
    }
  });

  on(root, "keydown", (event: KeyboardEvent) => {
    const el = annotated(event.target);
    if (el && el.dataset.twildaType === "image" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openImage(el);
    }
  });

  const isMultiline = (el: HTMLElement) => el.dataset.twildaType === "multiline";

  function startText(el: HTMLElement) {
    commitText();
    const current = getAtPath(doc, el.dataset.twildaRef ?? "");
    if (typeof current !== "string") return;
    editing = el;
    positionOverlay(null);
    // The raw value, not the styled rendering: findings split "Label: value" and paragraphs split on blank lines.
    el.textContent = current;
    el.contentEditable = isMultiline(el) ? "plaintext-only" : "true";
    if (el.contentEditable !== (isMultiline(el) ? "plaintext-only" : "true")) el.contentEditable = "true";
    el.dataset.twildaEditing = "true";
    document.body.classList.add("twilda-typing");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    el.addEventListener("blur", onBlur);
    el.addEventListener("keydown", onKey);
    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("paste", onPaste);
  }

  function endText(el: HTMLElement) {
    el.removeEventListener("blur", onBlur);
    el.removeEventListener("keydown", onKey);
    el.removeEventListener("beforeinput", onBeforeInput);
    el.removeEventListener("paste", onPaste);
    el.removeAttribute("contenteditable");
    delete el.dataset.twildaEditing;
    document.body.classList.remove("twilda-typing");
    editing = null;
  }

  function onBlur() {
    commitText();
  }

  function onKey(event: KeyboardEvent) {
    if (!editing) return;
    if (event.key === "Enter" && !isMultiline(editing)) {
      event.preventDefault();
      editing.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      const el = editing;
      el.removeEventListener("blur", onBlur);
      endText(el);
      restore(el);
      el.blur();
    }
  }

  function onBeforeInput(event: InputEvent) {
    if (!editing) return;
    const lineBreak = event.inputType === "insertParagraph" || event.inputType === "insertLineBreak";
    if (!lineBreak) return;
    event.preventDefault();
    if (isMultiline(editing)) document.execCommand("insertText", false, "\n");
    else editing.blur();
  }

  function onPaste(event: ClipboardEvent) {
    event.preventDefault();
    if (!editing) return;
    const pasted = event.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, isMultiline(editing) ? normalizeMultiline(pasted) : normalizeText(pasted));
  }

  function commitText() {
    const el = editing;
    if (!el) return;
    const ref = el.dataset.twildaRef ?? "";
    const multiline = isMultiline(el);
    const raw = multiline ? el.innerText : (el.textContent ?? "");
    const next = multiline ? normalizeMultiline(raw) : normalizeText(raw);
    const current = getAtPath(doc, ref);
    endText(el);
    if (typeof current !== "string" || next === current) {
      restore(el);
      return;
    }
    const result = applyEdit(doc, ref, next, { lenient: options.lenient });
    if (!result.ok) {
      restore(el);
      showError(result.error);
      return;
    }
    doc = result.doc;
    restore(el);
    options.onChange?.(doc, { ref });
  }

  function buildImageSheet() {
    const grid = h("div", { class: "twilda-thumbs", role: "listbox", "aria-label": "Images in the repo" });
    const alt = h("input", { type: "text", class: "twilda-input", id: "twilda-alt", maxlength: "200", "data-testid": "alt-input" });
    const heading = h("h2", { id: "twilda-image-title" }, "Replace image");
    const close = h("button", { type: "button", class: "twilda-btn", "data-testid": "image-close" }, "Done");
    const el = h(
      "section",
      { class: "twilda-sheet", role: "dialog", "aria-labelledby": "twilda-image-title", hidden: "", "data-testid": "image-sheet" },
      h("div", { class: "twilda-sheet-head" }, heading, close),
      grid,
      h("label", { class: "twilda-field", for: "twilda-alt" }, h("span", {}, "Alt text (what the image shows)"), alt),
      h("p", { class: "twilda-hint" }, "Images come from public/media in the repo. Uploading new images is not built yet."),
    );
    for (const src of media) {
      grid.append(
        h(
          "button",
          { type: "button", class: "twilda-thumb", role: "option", "data-src": src, "aria-label": src.replace("/media/", "") },
          h("img", { src, alt: "" }),
        ),
      );
    }
    grid.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-src]") : null;
      if (!button || !imageRef) return;
      const result = applyEdit(doc, imageRef.ref, button.dataset.src ?? "", { lenient: options.lenient });
      if (!result.ok) return showError(result.error);
      doc = result.doc;
      options.onChange?.(doc, { ref: imageRef.ref });
      render();
      syncImageSheet();
    });
    alt.addEventListener("change", () => {
      if (!imageRef) return;
      const result = applyEdit(doc, imageRef.altRef, normalizeText(alt.value), { lenient: options.lenient });
      if (!result.ok) {
        syncImageSheet();
        return showError(result.error);
      }
      doc = result.doc;
      options.onChange?.(doc, { ref: imageRef.altRef });
      render();
    });
    close.addEventListener("click", () => {
      imageRef = null;
      el.hidden = true;
    });
    return { el, grid, alt };
  }

  function syncImageSheet() {
    if (!imageRef) return;
    const current = getAtPath(doc, imageRef.ref);
    for (const button of imageSheet.grid.querySelectorAll<HTMLElement>("[data-src]")) {
      button.setAttribute("aria-selected", String(button.dataset.src === current));
    }
    const alt = getAtPath(doc, imageRef.altRef);
    imageSheet.alt.value = typeof alt === "string" ? alt : "";
  }

  function openImage(el: HTMLElement) {
    positionOverlay(null);
    imageRef = { ref: el.dataset.twildaRef ?? "", altRef: el.dataset.twildaAltRef ?? "" };
    imageSheet.el.hidden = false;
    syncImageSheet();
    imageSheet.grid.querySelector<HTMLElement>("[aria-selected=true]")?.focus();
  }

  if (options.renderOnMount === false) decorate(root);
  else render();
  root.classList.add("twilda-live");

  return {
    getDoc: () => doc,
    setDoc(next) {
      if (editing) commitText();
      if (contentDigest(next) === contentDigest(doc)) return;
      doc = next;
      render();
      syncImageSheet();
    },
    setOutlines(on) {
      root.classList.toggle("twilda-outlines", on);
    },
    hasOutlines: () => root.classList.contains("twilda-outlines"),
    commit: commitText,
    showError,
    destroy() {
      commitText();
      window.clearTimeout(toastTimer);
      for (const off of listeners) off();
      toast.remove();
      overlay.remove();
      imageSheet.el.remove();
      root.classList.remove("twilda-live", "twilda-outlines");
    },
  };
}
