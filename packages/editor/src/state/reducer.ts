import {
  fingerprint,
  type ArticleDoc,
  type Block,
  type Doc,
  type DocSummary,
  type MediaAsset,
  type MetaPatch,
  type PageDoc,
  type PageSection,
} from "../model";
import { moveById } from "./move";

export type FailurePhase = "load" | "save" | "build" | "publish" | "revert" | "upload" | "import";

export type DeskView = "list" | "edit" | "preview" | "media" | "export";

export interface EditorState {
  phase: "ready" | "busy";
  busyLabel: string | null;
  documents: DocSummary[];
  activeId: string | null;
  draft: Doc | null;
  saved: Doc | null;
  published: Doc | null;
  view: DeskView;
  error: { phase: FailurePhase; message: string } | null;
  notice: string | null;
  confirm: "publish" | "revert" | "delete" | null;
  media: MediaAsset[];
  previewUrl: string | null;
}

export type Action =
  | { type: "hydrated"; documents: DocSummary[]; media: MediaAsset[] }
  | { type: "opened"; draft: Doc; published: Doc | null; previewUrl: string | null }
  | { type: "created"; draft: Doc; documents: DocSummary[]; notice: string }
  | { type: "deleted"; id: string; documents: DocSummary[] }
  | { type: "documents"; documents: DocSummary[]; notice: string }
  | { type: "autosaved"; saved: Doc; documents: DocSummary[] }
  | { type: "notice"; message: string }
  | { type: "view"; view: DeskView }
  | { type: "edit-meta"; patch: MetaPatch }
  | { type: "update-block"; block: Block }
  | { type: "add-block"; block: Block }
  | { type: "remove-block"; id: string }
  | { type: "move-block"; id: string; to: number }
  | { type: "update-section"; section: PageSection }
  | { type: "add-section"; section: PageSection }
  | { type: "remove-section"; id: string }
  | { type: "move-section"; id: string; to: number }
  | { type: "ask-confirm"; confirm: "publish" | "revert" | "delete" }
  | { type: "dismiss-confirm" }
  | { type: "busy"; label: string }
  | { type: "saved"; draft: Doc; documents: DocSummary[] }
  | { type: "published"; draft: Doc; published: Doc; documents: DocSummary[] }
  | { type: "reverted"; draft: Doc; published: Doc; documents: DocSummary[] }
  | { type: "uploaded"; asset: MediaAsset }
  | { type: "removed-media"; path: string }
  | { type: "failed"; phase: FailurePhase; message: string }
  | { type: "dismiss-error" };

export const initialState: EditorState = {
  phase: "ready",
  busyLabel: null,
  documents: [],
  activeId: null,
  draft: null,
  saved: null,
  published: null,
  view: "list",
  error: null,
  notice: "Loading the desk.",
  confirm: null,
  media: [],
  previewUrl: null,
};

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "hydrated":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        documents: action.documents,
        media: action.media,
        notice: "Desk ready. Save writes a draft. Publish is a separate step.",
      };
    case "opened":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        error: null,
        confirm: null,
        activeId: action.draft.id,
        draft: action.draft,
        saved: action.draft,
        published: action.published,
        previewUrl: action.previewUrl,
        view: "edit",
        notice: `Opened ${action.draft.title}.`,
      };
    case "created":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        error: null,
        confirm: null,
        activeId: action.draft.id,
        draft: action.draft,
        saved: action.draft,
        published: null,
        previewUrl: null,
        documents: action.documents,
        view: "edit",
        notice: action.notice,
      };
    case "deleted":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        error: null,
        confirm: null,
        activeId: null,
        draft: null,
        saved: null,
        published: null,
        previewUrl: null,
        documents: action.documents,
        view: "list",
        notice: "Document deleted from this device.",
      };
    case "documents":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        error: null,
        documents: action.documents,
        notice: action.notice,
      };
    case "autosaved":
      if (state.activeId !== action.saved.id) return state;
      return {
        ...state,
        saved: action.saved,
        documents: action.documents,
        notice: "Draft saved on this device. The published file is unchanged.",
      };
    case "notice":
      return { ...state, notice: action.message };
    case "view":
      return { ...state, view: action.view };
    case "edit-meta":
      if (!state.draft) return state;
      return { ...state, error: null, draft: { ...state.draft, ...action.patch } };
    case "update-block":
      return mapArticle(state, (article) => ({
        ...article,
        blocks: article.blocks.map((block) => (block.id === action.block.id ? action.block : block)),
      }));
    case "add-block":
      return mapArticle(state, (article) => ({
        ...article,
        blocks: [...article.blocks, action.block],
      }));
    case "remove-block":
      return mapArticle(state, (article) => ({
        ...article,
        blocks: article.blocks.filter((block) => block.id !== action.id),
      }));
    case "move-block":
      return mapArticle(state, (article) => ({
        ...article,
        blocks: moveById(article.blocks, action.id, action.to),
      }));
    case "update-section":
      return mapPage(state, (page) => ({
        ...page,
        sections: page.sections.map((section) =>
          section.id === action.section.id ? action.section : section,
        ),
      }));
    case "add-section":
      return mapPage(state, (page) => ({
        ...page,
        sections: [...page.sections, action.section],
      }));
    case "remove-section":
      return mapPage(state, (page) => ({
        ...page,
        sections: page.sections.filter((section) => section.id !== action.id),
      }));
    case "move-section":
      return mapPage(state, (page) => ({
        ...page,
        sections: moveById(page.sections, action.id, action.to),
      }));
    case "ask-confirm":
      if (!state.draft || state.phase === "busy") return state;
      if (action.confirm === "revert" && !state.published) return state;
      return { ...state, confirm: action.confirm };
    case "dismiss-confirm":
      return { ...state, confirm: null };
    case "busy":
      return { ...state, phase: "busy", busyLabel: action.label, error: null, confirm: null };
    case "saved":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        error: null,
        draft: action.draft,
        saved: action.draft,
        documents: action.documents,
        notice: "Draft saved. The published file is unchanged.",
      };
    case "published":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        error: null,
        confirm: null,
        draft: action.draft,
        saved: action.draft,
        published: action.published,
        documents: action.documents,
        notice: "Published. The static build reads this copy the next time it runs.",
      };
    case "reverted":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        error: null,
        confirm: null,
        draft: action.draft,
        saved: action.draft,
        published: action.published,
        documents: action.documents,
        notice: "Draft reset to the published copy.",
      };
    case "uploaded":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        error: null,
        media: [...state.media.filter((item) => item.path !== action.asset.path), action.asset],
        notice: `Stored ${action.asset.name} on the desk backend.`,
      };
    case "removed-media":
      return {
        ...state,
        media: state.media.filter((item) => item.path !== action.path),
        notice: "Removed the file from the desk backend.",
      };
    case "failed":
      return {
        ...state,
        phase: "ready",
        busyLabel: null,
        confirm: null,
        error: { phase: action.phase, message: action.message },
        notice: null,
      };
    case "dismiss-error":
      return { ...state, error: null };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function mapArticle(state: EditorState, update: (article: ArticleDoc) => ArticleDoc): EditorState {
  if (state.draft?.kind !== "article") return state;
  return { ...state, error: null, draft: update(state.draft) };
}

function mapPage(state: EditorState, update: (page: PageDoc) => PageDoc): EditorState {
  if (state.draft?.kind !== "page") return state;
  return { ...state, error: null, draft: update(state.draft) };
}

export function isDirty(state: EditorState): boolean {
  if (!state.draft || !state.saved) return false;
  return fingerprint(state.draft) !== fingerprint(state.saved);
}

export const FAILURE_LABEL: Record<FailurePhase, string> = {
  load: "Could not load",
  save: "Save failed",
  build: "Build failed",
  publish: "Publish failed",
  revert: "Revert failed",
  upload: "Upload failed",
  import: "Import failed",
};
