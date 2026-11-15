import { renderDocument } from "../../src/render/document";
import { contentDigest } from "../../packages/core/src/serialize";
import type { TwildaDocument } from "../../packages/core/src/schema";
import type { ClickEditConfig } from "./config";
import { applyEdit, changedRefs, fieldLabel, getAtPath, normalizeText } from "./doc-path";
import { clearLocalDraft, saveLocalDraft, type StorageLike } from "./draft-store";
import { beginDeviceFlow, checkDeviceFlow, describeAuthError, publishToGithub } from "./publish";

export interface EditorDeps {
  root: HTMLElement;
  base: TwildaDocument;
  /** Starting document: the build's document, or a local draft layered over it. */
  initial: TwildaDocument;
  media: string[];
  storage: StorageLike;
  config: ClickEditConfig;
  fetchImpl?: typeof fetch;
}

export interface EditorHandle {
  getDoc(): TwildaDocument;
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

export function mountEditor(deps: EditorDeps): EditorHandle {
  const { root, base, media, storage, config } = deps;
  let doc = deps.initial;
  let editing: HTMLElement | null = null;
  let imageRef: { ref: string; altRef: string } | null = null;
  let token = "";
  let pollTimer: number | undefined;

  const status = h("p", { class: "twilda-status", role: "status", "aria-live": "polite", "data-testid": "status" });
  const toast = h("p", { class: "twilda-toast", role: "alert", hidden: "" });
  const overlay = h("div", { class: "twilda-overlay", hidden: "", "aria-hidden": "true" }, h("span", { class: "twilda-chip" }));
  const chip = overlay.firstElementChild as HTMLElement;

  const outlinesButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "outlines", "aria-pressed": "false" }, "Outlines");
  const resetButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "reset" }, "Reset");
  const publishButton = h("button", { type: "button", class: "twilda-btn twilda-primary", "data-testid": "publish-open" }, "Publish");
  const bar = h(
    "div",
    { class: "twilda-bar", "data-testid": "bar" },
    status,
    h("div", { class: "twilda-actions" }, outlinesButton, resetButton, publishButton),
  );

  const imageSheet = buildImageSheet();
  const publishSheet = buildPublishSheet();
  document.body.append(bar, toast, overlay, imageSheet.el, publishSheet.el);

  function say(message: string) {
    status.textContent = message;
  }

  function showError(message: string) {
    toast.textContent = message;
    toast.hidden = false;
    window.setTimeout(() => {
      if (toast.textContent === message) toast.hidden = true;
    }, 5000);
  }

  function editedCount(): number {
    return changedRefs(base, doc).length;
  }

  function refreshStatus(saved: boolean) {
    const count = editedCount();
    if (count === 0) {
      say("No edits yet. Tap any outlined text or image.");
    } else {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      say(`${count} edit${count === 1 ? "" : "s"}${saved ? ` · draft saved on this device ${time}` : ""}`);
    }
    resetButton.disabled = count === 0;
  }

  function persist() {
    const result = saveLocalDraft(storage, doc);
    if (!result.ok) {
      showError(`Could not save the draft on this device: ${result.error}`);
      return;
    }
    refreshStatus(true);
  }

  function decorate() {
    for (const el of root.querySelectorAll<HTMLElement>(REF)) {
      const ref = el.dataset.twildaRef ?? "";
      const label = fieldLabel(ref);
      el.dataset.twildaLabel = label;
      if (el.dataset.twildaType === "image") {
        el.setAttribute("role", el.tagName === "IMG" ? "button" : "img");
        el.setAttribute("tabindex", "0");
      }
    }
    for (const a of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      a.dataset.twildaHref = a.getAttribute("href") ?? "";
      a.removeAttribute("href");
    }
  }

  function render() {
    root.innerHTML = renderDocument(doc, { annotate: true });
    decorate();
  }

  function positionOverlay(el: HTMLElement | null) {
    if (!el) {
      overlay.hidden = true;
      return;
    }
    const rect = el.getBoundingClientRect();
    overlay.hidden = false;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    chip.textContent = el.dataset.twildaType === "image" ? "Replace image" : `Edit ${el.dataset.twildaLabel ?? "text"}`;
    overlay.classList.toggle("twilda-flip", rect.top < 36);
  }

  function annotated(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? target.closest<HTMLElement>(REF) : null;
  }

  root.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse" || editing) return;
    positionOverlay(annotated(event.target));
  });
  root.addEventListener("pointerleave", () => {
    if (!editing) positionOverlay(null);
  });
  window.addEventListener("scroll", () => {
    if (!editing) positionOverlay(null);
  }, { passive: true });

  root.addEventListener("click", (event) => {
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

  root.addEventListener("keydown", (event) => {
    const el = annotated(event.target);
    if (el && el.dataset.twildaType === "image" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openImage(el);
    }
  });

  function startText(el: HTMLElement) {
    commitText();
    editing = el;
    positionOverlay(null);
    el.contentEditable = "true";
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
    if (event.key === "Enter") {
      event.preventDefault();
      editing.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      const original = getAtPath(doc, editing.dataset.twildaRef ?? "");
      editing.textContent = typeof original === "string" ? original : "";
      editing.blur();
    }
  }

  function onBeforeInput(event: InputEvent) {
    if (event.inputType === "insertParagraph" || event.inputType === "insertLineBreak") {
      event.preventDefault();
      editing?.blur();
    }
  }

  function onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, normalizeText(pasted));
  }

  function commitText() {
    const el = editing;
    if (!el) return;
    const ref = el.dataset.twildaRef ?? "";
    const next = normalizeText(el.textContent ?? "");
    const current = getAtPath(doc, ref);
    endText(el);
    if (typeof current !== "string" || next === current) {
      el.textContent = typeof current === "string" ? current : el.textContent;
      return;
    }
    const result = applyEdit(doc, ref, next);
    if (!result.ok) {
      el.textContent = current;
      showError(result.error);
      return;
    }
    doc = result.doc;
    el.textContent = next;
    persist();
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
      h("p", { class: "twilda-hint" }, "Images come from public/media in the repo. Uploading new images is not in this prototype."),
    );
    for (const src of media) {
      const button = h(
        "button",
        { type: "button", class: "twilda-thumb", role: "option", "data-src": src, "aria-label": src.replace("/media/", "") },
        h("img", { src, alt: "" }),
      );
      grid.append(button);
    }
    grid.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-src]") : null;
      if (!button || !imageRef) return;
      const result = applyEdit(doc, imageRef.ref, button.dataset.src ?? "");
      if (!result.ok) return showError(result.error);
      doc = result.doc;
      persist();
      render();
      syncImageSheet();
    });
    alt.addEventListener("change", () => {
      if (!imageRef) return;
      const result = applyEdit(doc, imageRef.altRef, normalizeText(alt.value));
      if (!result.ok) {
        syncImageSheet();
        return showError(result.error);
      }
      doc = result.doc;
      persist();
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

  function buildPublishSheet() {
    const summary = h("p", { "data-testid": "publish-summary" });
    const list = h("ul", { class: "twilda-changes", "data-testid": "publish-changes" });
    const owner = h("input", { type: "text", class: "twilda-input", id: "twilda-owner", value: config.owner, "data-testid": "owner" });
    const repo = h("input", { type: "text", class: "twilda-input", id: "twilda-repo", value: config.repo, "data-testid": "repo" });
    const auth = h("div", { class: "twilda-auth", "data-testid": "auth" });
    const tokenInput = h("input", {
      type: "password",
      class: "twilda-input",
      id: "twilda-token",
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      "data-testid": "token-input",
    });
    const useToken = h("button", { type: "button", class: "twilda-btn", "data-testid": "token-use" }, "Use token");
    const submit = h("button", { type: "button", class: "twilda-btn twilda-primary", "data-testid": "publish-submit" }, "Open pull request");
    const result = h("p", { class: "twilda-result", role: "status", "aria-live": "polite", "data-testid": "publish-result" });
    const close = h("button", { type: "button", class: "twilda-btn", "data-testid": "publish-close" }, "Close");
    const el = h(
      "section",
      { class: "twilda-sheet", role: "dialog", "aria-labelledby": "twilda-publish-title", hidden: "", "data-testid": "publish-sheet" },
      h("div", { class: "twilda-sheet-head" }, h("h2", { id: "twilda-publish-title" }, "Publish"), close),
      summary,
      list,
      h("div", { class: "twilda-row" },
        h("label", { class: "twilda-field", for: "twilda-owner" }, h("span", {}, "Owner"), owner),
        h("label", { class: "twilda-field", for: "twilda-repo" }, h("span", {}, "Repository"), repo),
      ),
      auth,
      h("details", { class: "twilda-details" },
        h("summary", {}, "Use a token instead"),
        h("label", { class: "twilda-field", for: "twilda-token" }, h("span", {}, "Fine-grained token (contents and pull requests: write)"), tokenInput),
        useToken,
      ),
      submit,
      result,
      h("p", { class: "twilda-hint" }, "Your draft stays on this device. Publishing opens a pull request into main. Nothing goes live until it is merged. The token stays in this tab's memory."),
    );

    function renderAuth() {
      auth.replaceChildren();
      if (token) {
        auth.append(h("p", { "data-testid": "signed-in" }, "Signed in to GitHub for this tab."));
        return;
      }
      if (!config.clientId) {
        auth.append(h("p", { class: "twilda-hint" }, "GitHub sign-in is off: PUBLIC_TWILDA_GITHUB_CLIENT_ID was not set for this build. Use a token below."));
        return;
      }
      const start = h("button", { type: "button", class: "twilda-btn", "data-testid": "signin-start" }, "Sign in with GitHub");
      start.addEventListener("click", () => void beginSignIn());
      auth.append(start);
    }

    async function beginSignIn() {
      result.textContent = "";
      try {
        const flow = await beginDeviceFlow({ clientId: config.clientId, proxy: config.deviceFlowProxy, fetchImpl: deps.fetchImpl });
        const link = h("a", { href: flow.verificationUri, target: "_blank", rel: "noopener noreferrer" }, flow.verificationUri);
        auth.replaceChildren(
          h("p", {}, "Enter this code on GitHub: ", h("strong", { class: "twilda-code", "data-testid": "user-code" }, flow.userCode)),
          h("p", {}, link),
          h("p", { class: "twilda-hint", "data-testid": "signin-wait" }, "Waiting for GitHub. This checks automatically."),
        );
        const interval = Math.max(flow.interval, 1) * 1000;
        const deadline = Date.now() + flow.expiresIn * 1000;
        const tick = async () => {
          if (token || Date.now() > deadline) return;
          try {
            const polled = await checkDeviceFlow({
              clientId: config.clientId,
              proxy: config.deviceFlowProxy,
              deviceCode: flow.deviceCode,
              fetchImpl: deps.fetchImpl,
            });
            if (polled.status === "ready" && polled.accessToken) {
              token = polled.accessToken;
              renderAuth();
              return;
            }
          } catch (error) {
            result.textContent = describeAuthError(error, config.deviceFlowProxy);
            renderAuth();
            return;
          }
          pollTimer = window.setTimeout(() => void tick(), interval);
        };
        pollTimer = window.setTimeout(() => void tick(), interval);
      } catch (error) {
        result.textContent = describeAuthError(error, config.deviceFlowProxy);
        result.dataset.state = "error";
      }
    }

    useToken.addEventListener("click", () => {
      const value = tokenInput.value.trim();
      if (!value) return;
      token = value;
      tokenInput.value = "";
      renderAuth();
    });

    submit.addEventListener("click", async () => {
      result.dataset.state = "";
      result.textContent = "Opening pull request...";
      submit.disabled = true;
      try {
        const pr = await publishToGithub({
          token,
          owner: owner.value.trim(),
          repo: repo.value.trim(),
          base,
          doc,
          fetchImpl: deps.fetchImpl,
        });
        result.replaceChildren("Pull request opened: ", h("a", { href: pr.url, target: "_blank", rel: "noopener noreferrer", "data-testid": "pr-link" }, `#${pr.number}`));
        result.dataset.state = "ok";
      } catch (error) {
        result.textContent = error instanceof Error ? error.message : "Publish failed.";
        result.dataset.state = "error";
      } finally {
        submit.disabled = false;
      }
    });

    close.addEventListener("click", () => {
      window.clearTimeout(pollTimer);
      el.hidden = true;
    });

    return {
      el,
      open() {
        const changed = changedRefs(base, doc);
        summary.textContent = changed.length
          ? `${changed.length} edited field${changed.length === 1 ? "" : "s"} will go into one pull request.`
          : "No edits yet. Change some text or an image first.";
        list.replaceChildren(...changed.slice(0, 8).map((ref) => h("li", {}, h("code", {}, ref))));
        if (changed.length > 8) list.append(h("li", {}, `and ${changed.length - 8} more`));
        submit.disabled = changed.length === 0;
        result.textContent = "";
        renderAuth();
        el.hidden = false;
      },
    };
  }

  outlinesButton.addEventListener("click", () => {
    const on = root.classList.toggle("twilda-outlines");
    outlinesButton.setAttribute("aria-pressed", String(on));
  });

  resetButton.addEventListener("click", () => {
    commitText();
    if (!window.confirm("Discard all local edits and go back to the built page?")) return;
    clearLocalDraft(storage, base.id);
    doc = base;
    render();
    refreshStatus(false);
  });

  publishButton.addEventListener("click", () => {
    commitText();
    publishSheet.open();
  });

  if (window.matchMedia("(hover: none)").matches) {
    root.classList.add("twilda-outlines");
    outlinesButton.setAttribute("aria-pressed", "true");
  }

  if (contentDigest(doc) === contentDigest(base)) {
    decorate();
  } else {
    render();
  }
  root.classList.add("twilda-live");
  refreshStatus(false);

  return { getDoc: () => doc };
}
