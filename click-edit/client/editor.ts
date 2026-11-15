import { contentDigest, type TwildaDocument } from "@twilda/core";
import { changedRefs, mountOverlay } from "@twilda/core/edit";
import type { ClickEditConfig } from "./config";
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

export function mountEditor(deps: EditorDeps): EditorHandle {
  const { root, base, media, storage, config } = deps;
  let doc = deps.initial;
  let token = "";
  let pollTimer: number | undefined;

  const status = h("p", { class: "twilda-status", role: "status", "aria-live": "polite", "data-testid": "status" });

  const outlinesButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "outlines", "aria-pressed": "false" }, "Outlines");
  const resetButton = h("button", { type: "button", class: "twilda-btn", "data-testid": "reset" }, "Reset");
  const publishButton = h("button", { type: "button", class: "twilda-btn twilda-primary", "data-testid": "publish-open" }, "Publish");
  const bar = h(
    "div",
    { class: "twilda-bar", "data-testid": "bar" },
    status,
    h("div", { class: "twilda-actions" }, outlinesButton, resetButton, publishButton),
  );

  const overlay = mountOverlay({
    root,
    doc,
    media,
    renderOnMount: contentDigest(doc) !== contentDigest(base),
    onChange(next) {
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
    overlay.setOutlines(!overlay.hasOutlines());
    outlinesButton.setAttribute("aria-pressed", String(overlay.hasOutlines()));
  });

  resetButton.addEventListener("click", () => {
    overlay.commit();
    if (!window.confirm("Discard all local edits and go back to the built page?")) return;
    clearLocalDraft(storage, base.id);
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
