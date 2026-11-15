import {
  canRedo,
  canUndo,
  contentDigest,
  defaultSite,
  emptyHistory,
  recordChange,
  redo,
  resolveChrome,
  undo,
  type History,
  type MergeChoice,
  type MergeConflict,
  type SiteSettings,
  type TwildaDocument,
} from "@twilda/core";
import { changedRefs, mountOverlay, prepareImage } from "@twilda/core/edit";
import type { ClickEditConfig } from "./config";
import { clearLocalDraft, saveLocalDraft, type StorageLike } from "./draft-store";
import { beginDeviceFlow, checkDeviceFlow, describeAuthError, PublishConflict, publishToGithub } from "./publish";
import { loadSync, loadUpload, saveSync, saveUpload } from "./sync-store";

export interface EditorDeps {
  root: HTMLElement;
  base: TwildaDocument;
  /** Starting document: the build's document, or a local draft layered over it. */
  initial: TwildaDocument;
  media: string[];
  /** Masthead and theme from `content/site.json`, so the editor shows the page the site prints. */
  site?: SiteSettings;
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

export function mountEditor(deps: EditorDeps): EditorHandle {
  const { root, base, media, storage, config } = deps;
  const site = deps.site ?? defaultSite();
  let doc = deps.initial;
  let token = "";
  let history: History<TwildaDocument> = emptyHistory<TwildaDocument>();
  const uploads = new Map<string, { dataUrl: string; base64: string }>();
  let pollTimer: number | undefined;

  const status = h("p", { class: "twilda-status", role: "status", "aria-live": "polite", "data-testid": "status" });

  const undoButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "undo", disabled: "" }, "Undo");
  const redoButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "redo", disabled: "" }, "Redo");
  const structureButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "structure", "aria-pressed": "false" }, "Sections");
  const outlinesButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "outlines", "aria-pressed": "false" }, "Outlines");
  const resetButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "reset" }, "Reset");
  const publishButton = h("button", { type: "button", class: "twilda-btn twilda-primary", "data-testid": "publish-open" }, "Publish");
  const bar = h(
    "div",
    { class: "twilda-bar", "data-testid": "bar" },
    status,
    h("div", { class: "twilda-actions" }, undoButton, redoButton, structureButton, outlinesButton, resetButton, publishButton),
  );

  const chromeFor = (value: TwildaDocument) => ({ chrome: resolveChrome(site, value) });

  function showUploads(scope: HTMLElement) {
    for (const img of scope.querySelectorAll<HTMLImageElement>("img[src^='/media/']")) {
      const name = (img.getAttribute("src") ?? "").slice("/media/".length);
      const local = uploads.get(name)?.dataUrl;
      if (local) img.setAttribute("src", local);
    }
  }

  for (const name of printedUploads(doc)) {
    const stored = loadUpload(storage, name);
    if (stored) uploads.set(name, { dataUrl: stored, base64: stored.slice(stored.indexOf(",") + 1) });
  }

  const overlay = mountOverlay({
    root,
    doc,
    media,
    render: chromeFor(doc),
    renderOnMount: contentDigest(doc) !== contentDigest(base) || uploads.size > 0,
    onUploadImage: async (file) => {
      const taken = [...media.map((src) => src.replace("/media/", "")), ...uploads.keys()];
      const prepared = await prepareImage(file, { taken });
      uploads.set(prepared.name, { dataUrl: prepared.dataUrl, base64: prepared.base64 });
      saveUpload(storage, prepared.name, prepared.dataUrl);
      return { src: prepared.src, thumb: prepared.dataUrl };
    },
    onRender: showUploads,
    onChange(next, change) {
      history = recordChange(history, doc, { key: change.kind === "field" ? change.ref : null });
      doc = next;
      persist();
    },
  });
  const publishSheet = buildPublishSheet();
  document.body.append(bar, publishSheet.el);

  function say(message: string) {
    status.textContent = message;
  }

  function editedCount(): number {
    return changedRefs(base, doc).length;
  }

  function refreshHistory() {
    undoButton.disabled = !canUndo(history);
    redoButton.disabled = !canRedo(history);
  }

  function refreshStatus(saved: boolean) {
    refreshHistory();
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
      overlay.showError(`Could not save the draft on this device: ${result.error}`);
      return;
    }
    refreshStatus(true);
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
    const conflictBox = h("div", { class: "twilda-conflicts", "data-testid": "conflicts", hidden: "" });
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
      conflictBox,
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

    function showConflicts(conflicts: MergeConflict[]) {
      const decisions: Record<string, MergeChoice> = {};
      const rows = conflicts.map((item, index) => {
        decisions[item.key] = "ours";
        const pick = (choice: MergeChoice, text: unknown) => {
          const input = h("input", { type: "radio", name: `conflict-${index}`, value: choice, "data-testid": `conflict-${index}-${choice}` });
          if (choice === "ours") input.checked = true;
          input.addEventListener("change", () => {
            decisions[item.key] = choice;
          });
          return h("label", { class: "twilda-choice" }, input, h("span", {}, choice === "ours" ? "Mine: " : "On main: "), h("q", {}, preview(text)));
        };
        return h("fieldset", { class: "twilda-conflict", "data-testid": `conflict-${index}` }, h("legend", {}, item.label), pick("ours", item.ours), pick("theirs", item.theirs));
      });
      const apply = h("button", { type: "button", class: "twilda-btn twilda-primary", "data-testid": "conflict-apply" }, "Publish with these choices");
      apply.addEventListener("click", () => void run(decisions));
      conflictBox.replaceChildren(h("p", {}, `main changed ${conflicts.length} thing${conflicts.length === 1 ? "" : "s"} you also edited. Choose which to keep.`), ...rows, apply);
      conflictBox.hidden = false;
    }

    async function run(decisions?: Record<string, MergeChoice>) {
      result.dataset.state = "";
      result.textContent = "Opening pull request...";
      conflictBox.hidden = true;
      submit.disabled = true;
      const sync = loadSync(storage, base.id);
      try {
        const pr = await publishToGithub({
          token,
          owner: owner.value.trim(),
          repo: repo.value.trim(),
          base: sync.base ?? base,
          doc,
          media: uploadPayload(),
          decisions,
          known: sync.sent,
          fetchImpl: deps.fetchImpl,
        });
        saveSync(storage, base.id, { base: pr.seen ?? sync.base ?? base, sent: [...sync.sent, pr.doc] });
        if (pr.rebased) {
          doc = pr.doc;
          overlay.setDoc(doc);
          persist();
        }
        result.replaceChildren(
          pr.rebased ? "main had moved, so your edits were merged with it. " : "",
          "Pull request opened: ",
          h("a", { href: pr.url, target: "_blank", rel: "noopener noreferrer", "data-testid": "pr-link" }, `#${pr.number}`),
        );
        result.dataset.state = "ok";
      } catch (error) {
        if (error instanceof PublishConflict) {
          result.textContent = "";
          showConflicts(error.conflicts);
        } else {
          result.textContent = error instanceof Error ? error.message : "Publish failed.";
          result.dataset.state = "error";
        }
      } finally {
        submit.disabled = false;
      }
    }

    submit.addEventListener("click", () => void run());

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
        conflictBox.hidden = true;
        renderAuth();
        el.hidden = false;
      },
    };
  }

  function uploadPayload(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const name of printedUploads(doc)) {
      const upload = uploads.get(name);
      if (upload) out[name] = upload.base64;
    }
    return out;
  }

  undoButton.addEventListener("click", () => {
    overlay.commit();
    const step = undo(history, doc);
    if (!step) return;
    history = step.history;
    doc = step.value;
    overlay.setDoc(doc);
    persist();
  });

  redoButton.addEventListener("click", () => {
    overlay.commit();
    const step = redo(history, doc);
    if (!step) return;
    history = step.history;
    doc = step.value;
    overlay.setDoc(doc);
    persist();
  });

  structureButton.addEventListener("click", () => {
    overlay.commit();
    overlay.setStructure(!overlay.hasStructure());
    structureButton.setAttribute("aria-pressed", String(overlay.hasStructure()));
  });

  outlinesButton.addEventListener("click", () => {
    overlay.setOutlines(!overlay.hasOutlines());
    outlinesButton.setAttribute("aria-pressed", String(overlay.hasOutlines()));
  });

  resetButton.addEventListener("click", () => {
    overlay.commit();
    if (!window.confirm("Discard all local edits and go back to the built page?")) return;
    clearLocalDraft(storage, base.id);
    history = emptyHistory<TwildaDocument>();
    doc = base;
    overlay.setDoc(base);
    refreshStatus(false);
  });

  publishButton.addEventListener("click", () => {
    overlay.commit();
    publishSheet.open();
  });

  if (window.matchMedia("(hover: none)").matches) {
    overlay.setOutlines(true);
    outlinesButton.setAttribute("aria-pressed", "true");
  }

  refreshStatus(false);

  return { getDoc: () => doc };
}

function preview(value: unknown): string {
  if (value === undefined) return "(removed)";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

/** File names of repo-media images a document prints. */
function printedUploads(doc: TwildaDocument): string[] {
  const names = new Set<string>();
  for (const match of JSON.stringify(doc).matchAll(/\/media\/([a-z0-9][a-z0-9-]{0,60}\.jpg)/g)) names.add(match[1] as string);
  return [...names];
}
