import type { HistoryEntry, MediaUpload, TwildaEditorApi } from "./editor-api";
import { TwildaError } from "./errors";
import {
  BASE_BRANCH,
  documentIdFromPath,
  draftBranchName,
  draftPath,
  historyDir,
  historyPath,
  mediaRecordPath,
  publishedPath,
  stampFromIso,
} from "./paths";
import { renderPreviewPage } from "./render";
import { contentDigest, parseDocument, serializeDocument } from "./serialize";
import type { TwildaDocument } from "./schema";
import type { StorageBackend } from "./storage";

const MAX_MEDIA_BYTES = 1_500_000;

function decodedLength(base64: string): number {
  const cleaned = base64.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) || cleaned.length % 4 !== 0) {
    throw new TwildaError("Image bytes are not base64.", "bad-media");
  }
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return (cleaned.length / 4) * 3 - padding;
}
const ALLOWED_MEDIA = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

export interface EditorSessionOptions {
  now?: () => Date;
  reset?: () => Promise<void>;
}

async function readDoc(backend: StorageBackend, docPath: string): Promise<TwildaDocument> {
  const file = await backend.read(docPath);
  return parseDocument(file.text);
}

async function readOptionalDoc(backend: StorageBackend, docPath: string): Promise<TwildaDocument | null> {
  try {
    return await readDoc(backend, docPath);
  } catch (error) {
    if (error instanceof TwildaError && error.code === "not-found") return null;
    throw error;
  }
}

export function createEditorApi(backend: StorageBackend, options: EditorSessionOptions = {}): TwildaEditorApi {
  const now = options.now ?? (() => new Date());
  const main = () => backend.at(BASE_BRANCH);

  async function dataFiles(doc: TwildaDocument, source: StorageBackend): Promise<Record<string, string>> {
    if (doc.kind !== "article") return {};
    const out: Record<string, string> = {};
    for (const block of doc.blocks) {
      if (block.type !== "chart") continue;
      try {
        out[block.dataPath] = (await source.read(block.dataPath)).text;
      } catch (error) {
        if (!(error instanceof TwildaError) || error.code !== "not-found") throw error;
      }
    }
    return out;
  }

  return {
    async listDocuments() {
      const files = await main().list("content");
      const ids = new Set<string>();
      for (const item of files) {
        const hit = documentIdFromPath(item.path);
        if (hit) ids.add(hit.id);
      }
      const docs = [];
      for (const id of [...ids].sort()) {
        const published = await readOptionalDoc(main(), publishedPath(id));
        const branch = draftBranchName(id);
        const onBranch = await readOptionalDoc(backend.at(branch), draftPath(id));
        const onMain = await readOptionalDoc(main(), draftPath(id));
        const draft = onBranch ?? onMain ?? published;
        if (!draft) continue;
        docs.push({
          id,
          kind: draft.kind,
          title: draft.title,
          slug: draft.slug,
          updatedAt: draft.updatedAt,
          branch,
          hasUnpublishedChanges: !published || contentDigest(draft) !== contentDigest(published),
        });
      }
      for (const draft of await backend.listDrafts()) {
        if (docs.some((doc) => doc.id === draft.id)) continue;
        docs.push({
          id: draft.id,
          kind: draft.kind,
          title: draft.title,
          slug: draft.slug,
          updatedAt: draft.updatedAt,
          branch: draft.branch,
          hasUnpublishedChanges: draft.hasUnpublishedChanges,
        });
      }
      return docs.sort((a, b) => a.title.localeCompare(b.title));
    },

    async readDocument(id, source) {
      if (source === "published") return readDoc(main(), publishedPath(id));
      const found =
        (await readOptionalDoc(backend.at(draftBranchName(id)), draftPath(id))) ??
        (await readOptionalDoc(main(), draftPath(id))) ??
        (await readOptionalDoc(main(), publishedPath(id)));
      if (!found) throw new TwildaError(`No document "${id}".`, "not-found");
      return found;
    },

    async saveDraft(doc) {
      const stamped: TwildaDocument = { ...doc, status: "draft", updatedAt: now().toISOString() };
      const text = serializeDocument(stamped);
      const path = draftPath(stamped.id);
      const branch = draftBranchName(stamped.id);
      await backend.createBranch(branch, BASE_BRANCH);
      await backend.at(branch).write(path, text);
      return parseDocument(text);
    },

    async publish(id) {
      const current = await this.readDocument(id, "draft");
      let previous = "";
      try {
        previous = (await main().read(publishedPath(current.id))).text;
        if (contentDigest(parseDocument(previous)) === contentDigest(current)) {
          throw new TwildaError("Nothing unpublished to publish.", "nothing-to-publish");
        }
      } catch (error) {
        if (!(error instanceof TwildaError) || error.code !== "not-found") throw error;
      }
      const when = now().toISOString();
      const published: TwildaDocument = { ...current, status: "published", updatedAt: when };
      const text = serializeDocument(published);
      const path = publishedPath(published.id);
      const branch = draftBranchName(id);
      await backend.createBranch(branch, BASE_BRANCH);
      const history = {
        path,
        at: when,
        message: `Before publish ${id}`,
        text: previous,
      };
      await backend.at(branch).write(historyPath(id, stampFromIso(when)), `${JSON.stringify(history, null, 2)}\n`);
      await backend.at(branch).write(path, text);
      await backend.at(branch).write(draftPath(id), serializeDocument({ ...published, status: "draft" }));
      const pullRequest = await backend.openPullRequest({
        title: `Publish ${published.title}`,
        head: branch,
        base: BASE_BRANCH,
        body: "Publish copies the draft onto main. In the browser demo this merge is local. It is not a GitHub pull request.",
      });
      const merged = await backend.mergePullRequest(pullRequest.number);
      return { document: parseDocument(text), pullRequest: merged };
    },

    async listHistory(id) {
      const prefix = historyDir(id);
      let items: { path: string }[] = [];
      try {
        items = await main().list(prefix);
      } catch (error) {
        if (error instanceof TwildaError && error.code === "not-found") return [];
        throw error;
      }
      const entries: HistoryEntry[] = [];
      for (const item of items) {
        if (!item.path.endsWith(".json")) continue;
        const raw = JSON.parse((await main().read(item.path)).text) as HistoryEntry;
        entries.push(raw);
      }
      return entries.sort((a, b) => a.at.localeCompare(b.at));
    },

    async rollback(id) {
      const history = await this.listHistory(id);
      const latest = history.at(-1);
      if (!latest) throw new TwildaError(`No published history for "${id}" to roll back.`, "nothing-to-rollback");
      const when = now().toISOString();
      const branch = `twilda/revert/${id}-${stampFromIso(when)}`;
      await backend.createBranch(branch, BASE_BRANCH);
      const view = backend.at(branch);
      if (latest.text === "") await view.delete(latest.path);
      else await view.write(latest.path, latest.text);
      const historyFiles = await view.list(historyDir(id));
      const consumed = historyFiles.find((file) => file.path.endsWith(`${stampFromIso(latest.at)}.json`));
      if (consumed) await view.delete(consumed.path);
      const pullRequest = await backend.openPullRequest({
        title: `Revert ${id}`,
        head: branch,
        base: BASE_BRANCH,
        body: latest.message,
      });
      await backend.mergePullRequest(pullRequest.number);
      if (latest.text === "") {
        throw new TwildaError(`Rolled back "${id}" by unpublishing it. It was not published before, so only its draft is kept.`, "rolled-back-removed");
      }
      const restored = parseDocument(latest.text);
      await backend.createBranch(draftBranchName(id), BASE_BRANCH);
      await backend.at(draftBranchName(id)).write(draftPath(id), serializeDocument({ ...restored, status: "draft" }));
      return restored;
    },

    async uploadMedia(input: MediaUpload) {
      if (!ALLOWED_MEDIA.has(input.mediaType)) {
        throw new TwildaError("Upload a PNG, JPEG, WEBP, GIF, or SVG.", "bad-media");
      }
      const bytes = decodedLength(input.bytesBase64);
      if (bytes === 0 || bytes > MAX_MEDIA_BYTES) {
        throw new TwildaError("Image must be under 1.5 MB.", "bad-media");
      }
      const safe = input.filename.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "") || "image";
      const name = `${input.documentId}-${stampFromIso(now().toISOString())}-${safe}`
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .slice(0, 80);
      const path = mediaRecordPath(name.replace(/\.(png|jpe?g|webp|gif|svg)$/i, "") || name);
      const record = JSON.stringify({ mediaType: input.mediaType, bytesBase64: input.bytesBase64 });
      const branch = draftBranchName(input.documentId);
      await backend.createBranch(branch, BASE_BRANCH);
      await backend.at(branch).write(path, record);
      return { src: `data:${input.mediaType};base64,${input.bytesBase64}`, path };
    },

    async previewHtml(id, source) {
      const doc = await this.readDocument(id, source);
      let reader = main();
      if (source === "draft") {
        try {
          reader = backend.at(draftBranchName(doc.id));
        } catch (error) {
          if (!(error instanceof TwildaError) || error.code !== "not-found") throw error;
        }
      }
      return renderPreviewPage(doc, { dataFiles: await dataFiles(doc, reader) });
    },

    async resetSample() {
      if (!options.reset) throw new TwildaError("This backend cannot reset sample content.", "reset-unsupported");
      await options.reset();
    },
  };
}
