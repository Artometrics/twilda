import { parseVideoUrl } from "../embed";
import { createBlock, createSection } from "../library";
import { isSafeLinkTarget, marksFromDom, renderMarks, type MarksLevel } from "../marks";
import { renderDocument, type RenderOptions } from "../render";
import { BLOCK_LABELS, SECTION_LABELS, type BlockType, type PageSectionType, type TwildaDocument } from "../schema";
import { contentDigest } from "../serialize";
import { addNode, duplicateNode, libraryFor, listLabel, moveNode, parseNodePath, removeNode, type StructureResult } from "../structure";
import { applyEdit, fieldLabel, getAtPath, normalizeMultiline, normalizeText } from "./doc-path";
import { applyImageChoice, applyVideoChoice, describeVideo, VIDEO_HELP } from "./media";

/**
 * Click-on-the-page editing over the one renderer.
 *
 * The overlay renders the document with `annotate: true`, outlines the fields
 * that carry a `data-twilda-ref`, and edits them where they sit: text through
 * `contenteditable` (with bold, italic, and links where the field allows marks),
 * images through a picker that can also upload, video through an allowlisted
 * link box. With structure on, each section or block gets controls to move,
 * duplicate, and remove it, and a library to add a prepared one.
 * Every commit goes through the `@twilda/core` schema. Nothing here can add keys,
 * invent a new kind of part, or position anything freely, so a page cannot stop
 * being a prepared page. The overlay owns no storage and no publish step:
 * the host decides what to do with each change.
 */

export interface MediaChoice {
  /** What the page prints: `/media/plate-map.svg`. */
  src: string;
  /** What the picker shows, when that is not the file itself (an upload not yet in the repo). */
  thumb?: string;
}

export interface OverlayOptions {
  /** Element the template is rendered into. It gains `twilda-live` once mounted. */
  root: HTMLElement;
  /** Starting document. */
  doc: TwildaDocument;
  /** Repo images the picker offers, e.g. `/media/plate-map.svg`. */
  media: Array<string | MediaChoice>;
  /**
   * Prepare and keep a picked file, and return the repo path the page will print.
   * Throw an `Error` with a message a person can read to refuse the file.
   * Without this, the picker offers repo images only.
   */
  onUploadImage?: (file: File) => Promise<MediaChoice>;
  /** Options passed to the renderer. `annotate` is always on. */
  render?: Omit<RenderOptions, "annotate">;
  /** Accept edits to a field when the rest of the draft is not yet schema-valid. */
  lenient?: boolean;
  /** Render the document into `root` on mount. Off when the server already did (and it matches). */
  renderOnMount?: boolean;
  /** Start with the section controls on. */
  structure?: boolean;
  /** Where the toast and the sheets go. Default `document.body`. */
  host?: HTMLElement;
  /** Called after a validated edit. `ref` is the field, or the section or block for a structure change. */
  onChange?: (doc: TwildaDocument, change: { ref: string; kind?: "field" | "structure" | "media" }) => void;
  /** Called with a human message when an edit is refused. Default: an in-page toast. */
  onError?: (message: string) => void;
  /** Called with `root` after a full render and with an element after its text is restored. */
  onRender?: (scope: HTMLElement) => void;
}

export interface OverlayHandle {
  getDoc(): TwildaDocument;
  /** Replace the document, for example after a form edit elsewhere. Re-renders only if it differs. */
  setDoc(doc: TwildaDocument): void;
  /** Replace the images the picker offers. */
  setMedia(media: Array<string | MediaChoice>): void;
  setOutlines(on: boolean): void;
  hasOutlines(): boolean;
  setStructure(on: boolean): void;
  hasStructure(): boolean;
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
const normalizeMedia = (list: Array<string | MediaChoice>): MediaChoice[] =>
  list.map((item) => (typeof item === "string" ? { src: item } : item));

export function mountOverlay(options: OverlayOptions): OverlayHandle {
  const { root } = options;
  const host = options.host ?? document.body;
  let doc = options.doc;
  let media = normalizeMedia(options.media);
  let editing: HTMLElement | null = null;
  let editingMarks: MarksLevel | null = null;
  let imageRef: { ref: string; altRef: string } | null = null;
  let videoRef: { ref: string; titleRef: string } | null = null;
  let structureOn = options.structure === true;
  let toastTimer: number | undefined;
  let savedRange: Range | null = null;

  const toast = h("p", { class: "twilda-toast", role: "alert", hidden: "" });
  const overlay = h("div", { class: "twilda-overlay", hidden: "", "aria-hidden": "true" }, h("span", { class: "twilda-chip" }));
  const chip = overlay.firstElementChild as HTMLElement;
  const imageSheet = buildImageSheet();
  const videoSheet = buildVideoSheet();
  const librarySheet = buildLibrarySheet();
  const marksBar = buildMarksBar();
  host.append(toast, overlay, imageSheet.el, videoSheet.el, librarySheet.el, marksBar.el);

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
    for (const frame of scope.querySelectorAll<HTMLElement>("iframe")) frame.setAttribute("tabindex", "-1");
    if (scope === root) injectStructure();
    options.onRender?.(scope);
  }

  function label(el: HTMLElement) {
    el.dataset.twildaLabel = fieldLabel(el.dataset.twildaRef ?? "");
    const type = el.dataset.twildaType;
    if (type === "image" || type === "video") {
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
    chip.textContent =
      el.dataset.twildaType === "image" ? "Replace image" : el.dataset.twildaType === "video" ? "Change video" : `Edit ${el.dataset.twildaLabel ?? "text"}`;
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
    const act = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-twilda-act]") : null;
    if (act) {
      event.preventDefault();
      commitText();
      return handleAct(act);
    }
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    const el = annotated(event.target);
    if (link || el) event.preventDefault();
    if (!el) return commitText();
    if (el === editing) return;
    const type = el.dataset.twildaType;
    if (type === "image") {
      commitText();
      openImage(el);
    } else if (type === "video") {
      commitText();
      openVideo(el);
    } else {
      startText(el);
    }
  });

  on(root, "keydown", (event: KeyboardEvent) => {
    const el = annotated(event.target);
    if (!el || event.target !== el) return;
    const type = el.dataset.twildaType;
    if ((type === "image" || type === "video") && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      if (type === "image") openImage(el);
      else openVideo(el);
    }
  });

  const isMultiline = (el: HTMLElement) => el.dataset.twildaType === "multiline";

  function startText(el: HTMLElement) {
    commitText();
    const current = getAtPath(doc, el.dataset.twildaRef ?? "");
    if (typeof current !== "string") return;
    editing = el;
    editingMarks = el.dataset.twildaMarks === "links" || el.dataset.twildaMarks === "emphasis" ? el.dataset.twildaMarks : null;
    positionOverlay(null);
    if (editingMarks) {
      // Marks are shown as marks (bold, italic, links) and read back out of the DOM on commit.
      el.innerHTML = renderMarks(current, editingMarks);
      for (const a of el.querySelectorAll("a")) a.removeAttribute("target");
    } else {
      // The raw value, not the styled rendering: findings split "Label: value" and paragraphs split on blank lines.
      el.textContent = current;
    }
    const mode = editingMarks ? "true" : isMultiline(el) ? "plaintext-only" : "true";
    el.contentEditable = mode;
    if (el.contentEditable !== mode) el.contentEditable = "true";
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
    el.addEventListener("drop", onDrop);
    if (editingMarks) showMarksBar(editingMarks);
  }

  function endText(el: HTMLElement) {
    el.removeEventListener("blur", onBlur);
    el.removeEventListener("keydown", onKey);
    el.removeEventListener("beforeinput", onBeforeInput);
    el.removeEventListener("paste", onPaste);
    el.removeEventListener("drop", onDrop);
    el.removeAttribute("contenteditable");
    delete el.dataset.twildaEditing;
    document.body.classList.remove("twilda-typing");
    editing = null;
    editingMarks = null;
    savedRange = null;
    marksBar.hide();
  }

  function onBlur(event: FocusEvent) {
    const next = event.relatedTarget;
    if (next instanceof Node && marksBar.el.contains(next)) return;
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
    } else if ((event.metaKey || event.ctrlKey) && editingMarks && !event.shiftKey && !event.altKey) {
      if (event.key.toLowerCase() === "k" && editingMarks === "links") {
        event.preventDefault();
        openLinkForm();
      }
    }
  }

  function onBeforeInput(event: InputEvent) {
    if (!editing) return;
    const type = event.inputType;
    if (type === "insertParagraph" || type === "insertLineBreak") {
      event.preventDefault();
      if (isMultiline(editing)) document.execCommand("insertText", false, "\n");
      else editing.blur();
      return;
    }
    // Only bold and italic survive from the keyboard's own formatting commands; links come from the bar.
    if (type.startsWith("format") && type !== "formatBold" && type !== "formatItalic") event.preventDefault();
    if (type === "insertFromDrop" || type === "insertFromYank" || type === "insertTranspose") event.preventDefault();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
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
    const marks = editingMarks;
    const raw = marks ? marksFromDom(el, marks) : multiline ? el.innerText : (el.textContent ?? "");
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
    options.onChange?.(doc, { ref, kind: "field" });
  }

  // ---- marks bar -------------------------------------------------------------------------

  function buildMarksBar() {
    const button = (mark: string, text: string, testid: string, extra: Record<string, string> = {}) =>
      h("button", { type: "button", class: "twilda-mark", "data-mark": mark, "data-testid": testid, "aria-label": extra["aria-label"] ?? text, ...extra }, text);
    const bold = button("bold", "B", "mark-bold", { "aria-label": "Bold", "aria-pressed": "false" });
    const italic = button("italic", "I", "mark-italic", { "aria-label": "Italic", "aria-pressed": "false" });
    const link = button("link", "Link", "mark-link", { "aria-label": "Link" });
    const done = button("done", "Done", "mark-done", { "aria-label": "Done editing" });
    bold.classList.add("twilda-mark-bold");
    italic.classList.add("twilda-mark-italic");
    const url = h("input", {
      type: "text",
      class: "twilda-input",
      "data-testid": "link-input",
      inputmode: "url",
      autocapitalize: "off",
      autocomplete: "off",
      spellcheck: "false",
      placeholder: "https://example.com",
      "aria-label": "Link address",
    });
    const apply = h("button", { type: "button", class: "twilda-btn", "data-testid": "link-apply" }, "Apply");
    const remove = h("button", { type: "button", class: "twilda-btn", "data-testid": "link-remove" }, "Remove link");
    const cancel = h("button", { type: "button", class: "twilda-btn", "data-testid": "link-cancel" }, "Cancel");
    const note = h("p", { class: "twilda-hint", role: "status", "data-testid": "link-note" });
    const form = h("div", { class: "twilda-link-form", hidden: "" }, url, h("div", { class: "twilda-link-actions" }, apply, remove, cancel), note);
    const el = h("div", { class: "twilda-marks", role: "toolbar", "aria-label": "Text formatting", hidden: "", "data-testid": "marks-bar" }, h("div", { class: "twilda-marks-row" }, bold, italic, link, done), form);

    // Keep the selection and the keyboard where they are: a tap on a button must not blur the text.
    for (const type of ["pointerdown", "mousedown"]) {
      el.addEventListener(type, (event) => {
        if (!(event.target instanceof Element) || !event.target.closest("input")) event.preventDefault();
      });
    }
    el.addEventListener("focusout", (event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (!editing || (next instanceof Node && (el.contains(next) || editing.contains(next)))) return;
      window.setTimeout(() => {
        if (editing && !editing.contains(document.activeElement) && !el.contains(document.activeElement)) commitText();
      }, 0);
    });
    el.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("button") : null;
      if (!target || !editing) return;
      if (target === bold) formatSelection("bold");
      else if (target === italic) formatSelection("italic");
      else if (target === link) openLinkForm();
      else if (target === done) editing.blur();
      else if (target === apply) applyLink();
      else if (target === remove) removeLink();
      else if (target === cancel) closeLinkForm(true);
    });
    url.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyLink();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeLinkForm(true);
      }
    });

    const viewport = window.visualViewport;
    const follow = () => {
      if (!viewport) return;
      const gap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      el.style.setProperty("--twilda-kb", `${gap}px`);
    };
    viewport?.addEventListener("resize", follow);
    viewport?.addEventListener("scroll", follow);
    document.addEventListener("selectionchange", () => {
      if (!editing || el.hidden) return;
      for (const [btn, command] of [[bold, "bold"], [italic, "italic"]] as const) {
        let pressed = false;
        try {
          pressed = document.queryCommandState(command);
        } catch {
          pressed = false;
        }
        btn.setAttribute("aria-pressed", String(pressed));
      }
    });

    return {
      el,
      url,
      note,
      form,
      link,
      show(level: MarksLevel) {
        el.hidden = false;
        link.hidden = level !== "links";
        form.hidden = true;
        follow();
      },
      hide() {
        el.hidden = true;
        form.hidden = true;
      },
    };
  }

  function showMarksBar(level: MarksLevel) {
    marksBar.show(level);
  }

  function formatSelection(command: "bold" | "italic") {
    if (!editing) return;
    editing.focus();
    document.execCommand(command, false);
  }

  function selectionLink(): HTMLAnchorElement | null {
    const node = window.getSelection()?.anchorNode;
    const element = node instanceof Element ? node : node?.parentElement;
    const found = element?.closest("a");
    return found && editing?.contains(found) ? found : null;
  }

  function openLinkForm() {
    if (!editing || editingMarks !== "links") return;
    const selection = window.getSelection();
    const existing = selectionLink();
    if (!selection || selection.rangeCount === 0 || (selection.isCollapsed && !existing)) {
      marksBar.form.hidden = false;
      marksBar.note.textContent = "Select the words to link first, then tap Link.";
      marksBar.url.disabled = true;
      return;
    }
    savedRange = selection.getRangeAt(0).cloneRange();
    marksBar.url.disabled = false;
    marksBar.url.value = existing?.getAttribute("href") ?? "";
    marksBar.note.textContent = "Use https://, http://, mailto:, or a site path like /articles/story.";
    marksBar.form.hidden = false;
    marksBar.url.focus();
  }

  function closeLinkForm(refocus: boolean) {
    marksBar.form.hidden = true;
    marksBar.url.disabled = false;
    if (refocus && editing) restoreSelection();
  }

  function restoreSelection() {
    if (!editing) return;
    editing.focus();
    if (savedRange) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRange);
    }
  }

  function normalizeLink(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) return trimmed;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function applyLink() {
    if (!editing) return;
    const href = normalizeLink(marksBar.url.value);
    if (!isSafeLinkTarget(href)) {
      marksBar.note.textContent = "That address is not allowed. Use https://, http://, mailto:, or a site path.";
      return;
    }
    restoreSelection();
    const existing = selectionLink();
    if (existing) existing.setAttribute("href", href);
    else document.execCommand("createLink", false, href);
    closeLinkForm(false);
  }

  function removeLink() {
    if (!editing) return;
    restoreSelection();
    document.execCommand("unlink", false);
    closeLinkForm(false);
  }

  // ---- image and video sheets --------------------------------------------------------------

  function buildImageSheet() {
    const grid = h("div", { class: "twilda-thumbs", role: "listbox", "aria-label": "Images in the repo" });
    const alt = h("input", { type: "text", class: "twilda-input", id: "twilda-alt", maxlength: "240", "data-testid": "alt-input" });
    const heading = h("h2", { id: "twilda-image-title" }, "Replace image");
    const close = h("button", { type: "button", class: "twilda-btn", "data-testid": "image-close" }, "Done");
    const file = h("input", { type: "file", accept: "image/*", class: "twilda-file", "data-testid": "image-upload", "aria-label": "Upload a photo" });
    const upload = h("label", { class: "twilda-btn twilda-upload", "data-testid": "image-upload-label" }, "Upload a photo", file);
    const status = h("p", { class: "twilda-hint", role: "status", "aria-live": "polite", "data-testid": "image-status" });
    const el = h(
      "section",
      { class: "twilda-sheet", role: "dialog", "aria-labelledby": "twilda-image-title", hidden: "", "data-testid": "image-sheet" },
      h("div", { class: "twilda-sheet-head" }, heading, close),
      options.onUploadImage ? upload : null,
      status,
      grid,
      h("label", { class: "twilda-field", for: "twilda-alt" }, h("span", {}, "Alt text (what the image shows)"), alt),
      h(
        "p",
        { class: "twilda-hint" },
        options.onUploadImage
          ? "A photo is resized and compressed on this device, then committed to public/media in the same pull request as the page."
          : "Images come from public/media in the repo.",
      ),
    );
    grid.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-src]") : null;
      if (!button || !imageRef) return;
      chooseImage(button.dataset.src ?? "");
    });
    alt.addEventListener("change", () => {
      if (!imageRef) return;
      const result = applyImageChoice(doc, imageRef.ref, imageRef.altRef, { alt: alt.value }, { lenient: options.lenient });
      if (!result.ok) {
        syncImageSheet();
        return showError(result.error);
      }
      doc = result.doc;
      options.onChange?.(doc, { ref: imageRef.altRef, kind: "field" });
      render();
    });
    file.addEventListener("change", async () => {
      const picked = file.files?.[0];
      file.value = "";
      if (!picked || !imageRef || !options.onUploadImage) return;
      status.textContent = "Resizing and compressing…";
      status.dataset.state = "busy";
      try {
        const choice = await options.onUploadImage(picked);
        status.textContent = "Uploaded. It will be committed with the page when you publish.";
        status.dataset.state = "ok";
        if (!media.some((item) => item.src === choice.src)) media = [...media, choice];
        renderThumbs();
        chooseImage(choice.src, "media");
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "That image could not be used.";
        status.dataset.state = "error";
      }
    });
    close.addEventListener("click", () => {
      imageRef = null;
      el.hidden = true;
      status.textContent = "";
    });
    function renderThumbs() {
      grid.replaceChildren(
        ...media.map((item) =>
          h(
            "button",
            { type: "button", class: "twilda-thumb", role: "option", "data-src": item.src, "aria-label": item.src.replace("/media/", "") },
            h("img", { src: item.thumb ?? item.src, alt: "" }),
          ),
        ),
      );
    }
    renderThumbs();
    return { el, grid, alt, status, renderThumbs };
  }

  function chooseImage(src: string, kind: "field" | "media" = "field") {
    if (!imageRef) return;
    const result = applyImageChoice(doc, imageRef.ref, imageRef.altRef, { src }, { lenient: options.lenient });
    if (!result.ok) return showError(result.error);
    doc = result.doc;
    options.onChange?.(doc, { ref: imageRef.ref, kind });
    render();
    syncImageSheet();
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
    imageSheet.status.textContent = "";
    syncImageSheet();
    imageSheet.grid.querySelector<HTMLElement>("[aria-selected=true]")?.focus();
  }

  function buildVideoSheet() {
    const url = h("input", {
      type: "url",
      class: "twilda-input",
      id: "twilda-video-url",
      inputmode: "url",
      autocapitalize: "off",
      autocomplete: "off",
      spellcheck: "false",
      placeholder: "https://www.youtube.com/watch?v=…",
      "data-testid": "video-url",
    });
    const title = h("input", { type: "text", class: "twilda-input", id: "twilda-video-title", maxlength: "180", "data-testid": "video-title" });
    const current = h("p", { class: "twilda-hint", "data-testid": "video-current" });
    const note = h("p", { class: "twilda-hint", role: "status", "aria-live": "polite", "data-testid": "video-note" }, VIDEO_HELP);
    const save = h("button", { type: "button", class: "twilda-btn twilda-primary", "data-testid": "video-save" }, "Use this video");
    const close = h("button", { type: "button", class: "twilda-btn", "data-testid": "video-close" }, "Done");
    const el = h(
      "section",
      { class: "twilda-sheet", role: "dialog", "aria-labelledby": "twilda-video-heading", hidden: "", "data-testid": "video-sheet" },
      h("div", { class: "twilda-sheet-head" }, h("h2", { id: "twilda-video-heading" }, "Change video"), close),
      current,
      h("label", { class: "twilda-field", for: "twilda-video-url" }, h("span", {}, "Video link (YouTube or Vimeo)"), url),
      h("label", { class: "twilda-field", for: "twilda-video-title" }, h("span", {}, "Title (the frame's accessible name)"), title),
      note,
      save,
    );
    save.addEventListener("click", () => {
      if (!videoRef) return;
      const result = applyVideoChoice(doc, videoRef.ref, videoRef.titleRef, { url: url.value, title: title.value }, { lenient: options.lenient });
      if (!result.ok) {
        note.textContent = result.error;
        note.dataset.state = "error";
        return;
      }
      doc = result.doc;
      options.onChange?.(doc, { ref: videoRef.ref, kind: "media" });
      render();
      syncVideoSheet();
      note.textContent = "Saved. The page will play only this provider's player.";
      note.dataset.state = "ok";
    });
    close.addEventListener("click", () => {
      videoRef = null;
      el.hidden = true;
    });
    return { el, url, title, current, note };
  }

  function syncVideoSheet() {
    if (!videoRef) return;
    const src = getAtPath(doc, videoRef.ref);
    const title = getAtPath(doc, videoRef.titleRef);
    videoSheet.url.value = typeof src === "string" && parseVideoUrl(src) ? src : "";
    videoSheet.title.value = typeof title === "string" ? title : "";
    videoSheet.current.textContent = typeof src === "string" ? `Now: ${describeVideo(src)}` : "";
  }

  function openVideo(el: HTMLElement) {
    positionOverlay(null);
    videoRef = { ref: el.dataset.twildaRef ?? "", titleRef: el.dataset.twildaAltRef ?? "" };
    videoSheet.el.hidden = false;
    videoSheet.note.textContent = VIDEO_HELP;
    delete videoSheet.note.dataset.state;
    syncVideoSheet();
    videoSheet.url.focus();
  }

  // ---- structure: move, duplicate, remove, add ----------------------------------------------

  function nodeLabel(type: string): string {
    return (BLOCK_LABELS as Record<string, string>)[type] ?? (SECTION_LABELS as Record<string, string>)[type] ?? type;
  }

  function actButton(act: string, text: string, aria: string, index: number, disabled = false): HTMLButtonElement {
    const button = h("button", { type: "button", class: "twilda-node-btn", "data-twilda-act": act, "data-index": String(index), "aria-label": aria, "data-testid": `node-${act}-${index}` }, text);
    if (disabled) button.disabled = true;
    return button;
  }

  function addRow(at: number): HTMLElement {
    const { noun } = listLabel(doc);
    const button = h("button", { type: "button", class: "twilda-add", "data-twilda-act": "add", "data-at": String(at), "data-testid": `node-add-${at}` }, `+ Add ${noun}`);
    return h("div", { class: "twilda-add-row", "data-twilda-ui": "", contenteditable: "false" }, button);
  }

  function injectStructure() {
    for (const stale of root.querySelectorAll("[data-twilda-ui]")) stale.remove();
    root.classList.toggle("twilda-structure", structureOn);
    if (!structureOn) return;
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-twilda-node]")];
    const { plural } = listLabel(doc);
    nodes.forEach((el, i) => {
      const bar = h(
        "div",
        { class: "twilda-node-bar", "data-twilda-ui": "", contenteditable: "false", role: "group", "aria-label": `${nodeLabel(el.dataset.twildaNodeType ?? "")} controls` },
        h("span", { class: "twilda-node-name" }, `${nodeLabel(el.dataset.twildaNodeType ?? "")} · ${i + 1} of ${nodes.length}`),
        actButton("up", "↑", `Move ${plural.slice(0, -1)} up`, i, i === 0),
        actButton("down", "↓", `Move ${plural.slice(0, -1)} down`, i, i === nodes.length - 1),
        actButton("dup", "Copy", `Duplicate ${plural.slice(0, -1)}`, i),
        actButton("remove", "Remove", `Remove ${plural.slice(0, -1)}`, i, nodes.length <= 1),
      );
      el.before(bar);
      el.dataset.twildaNodeIndex = String(i);
    });
    const first = nodes[0];
    if (first) (first.previousElementSibling as HTMLElement | null)?.before(addRow(0));
    nodes.forEach((el, i) => el.after(addRow(i + 1)));
  }

  function applyStructure(result: StructureResult, ref: string) {
    if (!result.ok) return showError(result.error);
    doc = result.doc;
    options.onChange?.(doc, { ref, kind: "structure" });
    render();
    root.querySelector<HTMLElement>(`[data-twilda-node-index="${result.index}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function handleAct(button: HTMLElement) {
    const act = button.dataset.twildaAct;
    const index = Number(button.dataset.index);
    const { key } = nodeKey();
    if (act === "up") applyStructure(moveNode(doc, index, index - 1), `${key}.${index}`);
    else if (act === "down") applyStructure(moveNode(doc, index, index + 1), `${key}.${index}`);
    else if (act === "dup") applyStructure(duplicateNode(doc, index), `${key}.${index + 1}`);
    else if (act === "remove") applyStructure(removeNode(doc, index), `${key}.${index}`);
    else if (act === "add") openLibrary(Number(button.dataset.at));
  }

  function nodeKey(): { key: "sections" | "blocks" } {
    return { key: doc.kind === "page" ? "sections" : "blocks" };
  }

  function buildLibrarySheet() {
    const heading = h("h2", { id: "twilda-library-title" }, "Add a section");
    const close = h("button", { type: "button", class: "twilda-btn", "data-testid": "library-close" }, "Cancel");
    const list = h("ul", { class: "twilda-library", "data-testid": "library-list" });
    const el = h(
      "section",
      { class: "twilda-sheet", role: "dialog", "aria-labelledby": "twilda-library-title", hidden: "", "data-testid": "library-sheet" },
      h("div", { class: "twilda-sheet-head" }, heading, close),
      h("p", { class: "twilda-hint" }, "Prepared parts only. Pick one, then edit its words and images on the page."),
      list,
    );
    close.addEventListener("click", () => {
      el.hidden = true;
    });
    return { el, heading, list, at: 0 };
  }

  function preview(type: string): HTMLElement | null {
    const shell = {
      id: "preview",
      title: "Preview",
      slug: "preview",
      dek: "",
      kicker: "",
      status: "draft" as const,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const sample: TwildaDocument =
      doc.kind === "page"
        ? { ...shell, kind: "page", sections: [createSection(type as PageSectionType)] }
        : { ...shell, kind: "article", byline: "", blocks: [createBlock(type as BlockType)] };
    const scratch = document.createElement("div");
    scratch.innerHTML = renderDocument(sample, { annotate: true });
    const part = scratch.querySelector<HTMLElement>("[data-twilda-node]");
    if (!part) return null;
    for (const frame of part.querySelectorAll("iframe, script")) frame.remove();
    for (const node of [part, ...part.querySelectorAll<HTMLElement>("*")]) {
      for (const name of node.getAttributeNames()) if (name.startsWith("data-twilda") || name === "href" || name === "id") node.removeAttribute(name);
    }
    return part;
  }

  function openLibrary(at: number) {
    const { noun } = listLabel(doc);
    librarySheet.at = at;
    librarySheet.heading.textContent = `Add a ${noun}`;
    librarySheet.list.replaceChildren(
      ...libraryFor(doc).map((type) => {
        const frame = h("div", { class: "magazine twilda-preview", "aria-hidden": "true" });
        const part = preview(type);
        if (part) frame.append(part);
        const choose = h(
          "button",
          { type: "button", class: "twilda-library-item", "data-testid": `add-${type}`, "data-type": type },
          h("span", { class: "twilda-library-name" }, nodeLabel(type)),
          frame,
        );
        return h("li", {}, choose);
      }),
    );
    librarySheet.el.hidden = false;
    librarySheet.list.querySelector<HTMLElement>("button")?.focus();
  }

  librarySheet.list.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-type]") : null;
    if (!button) return;
    librarySheet.el.hidden = true;
    const { key } = nodeKey();
    applyStructure(addNode(doc, button.dataset.type ?? "", librarySheet.at), `${key}.${librarySheet.at}`);
  });

  void parseNodePath;

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
      syncVideoSheet();
    },
    setMedia(next) {
      media = normalizeMedia(next);
      imageSheet.renderThumbs();
      syncImageSheet();
    },
    setOutlines(on) {
      root.classList.toggle("twilda-outlines", on);
    },
    hasOutlines: () => root.classList.contains("twilda-outlines"),
    setStructure(on) {
      if (editing) commitText();
      structureOn = on;
      injectStructure();
    },
    hasStructure: () => structureOn,
    commit: commitText,
    showError,
    destroy() {
      commitText();
      window.clearTimeout(toastTimer);
      for (const off of listeners) off();
      toast.remove();
      overlay.remove();
      imageSheet.el.remove();
      videoSheet.el.remove();
      librarySheet.el.remove();
      marksBar.el.remove();
      for (const stale of root.querySelectorAll("[data-twilda-ui]")) stale.remove();
      root.classList.remove("twilda-live", "twilda-outlines", "twilda-structure");
    },
  };
}
