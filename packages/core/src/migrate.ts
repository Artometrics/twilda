import { TwildaError } from "./errors";
import type { Block, PageSection, TwildaDocument } from "./schema";
import { documentSchema } from "./schema";

/**
 * Turn a Field Desk document (one `sections` array, older block names)
 * into a contract v1 document. Text, links, and plate paths are kept.
 * Article lists become paragraphs. Pull quotes and figures become callouts
 * and images. Page features and tiles become story grids. Fact tables on
 * a page become a menu shelf.
 */

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function plate(): { image: string; imageAlt: string } {
  return {
    image: "/media/plate-signal.svg",
    imageAlt: "Geometric plate",
  };
}

interface StoryCard {
  id: string;
  kicker: string;
  title: string;
  dek: string;
  href: string;
  image: string;
  imageAlt: string;
}

function storyFrom(value: Raw, fallbackImage: { image: string; imageAlt: string }): StoryCard {
  const image = text(value.image) || text(value.src) || fallbackImage.image;
  const imageAlt = text(value.imageAlt) || text(value.alt) || fallbackImage.imageAlt;
  const byline = text(value.byline);
  const dek = [text(value.dek), byline].filter(Boolean).join(" ");
  return {
    id: text(value.id) || "story",
    kicker: text(value.kicker),
    title: text(value.title) || "Untitled",
    dek,
    href: text(value.href) || "/",
    image,
    imageAlt,
  };
}

function menuItem(id: string, label: string, dek: string, href: string) {
  return { id, label: label || "Item", dek, href: href || "/" };
}

function migrateSection(section: Raw, articleHref: string, kind: "article" | "page"): Array<Block | PageSection> {
  const id = text(section.id) || text(section.type) || "section";
  const type = text(section.type);
  switch (type) {
    case "heading":
      return [{ id, type: "heading", level: section.level === 3 ? 3 : 2, text: text(section.text) || "Heading" }];
    case "paragraph":
      return [{ id, type: "paragraph", text: text(section.text).trim() || "Paragraph" }];
    case "callout":
      return [{ id, type: "callout", title: text(section.title) || "Note", text: text(section.text).trim() || "Note" }];
    case "pull-quote":
      return [
        {
          id,
          type: "callout",
          title: text(section.attribution) || "Pull quote",
          text: text(section.quote).trim() || "Quote",
        },
      ];
    case "figure":
      return [
        {
          id,
          type: "image",
          src: text(section.image) || plate().image,
          alt: text(section.imageAlt) || "Plate",
          caption: text(section.caption),
          role: "figure",
        },
      ];
    case "list": {
      const items = Array.isArray(section.items) ? section.items.map((item) => text(item)).filter(Boolean) : [];
      const body = items
        .map((item, index) => (section.ordered === false ? `• ${item}` : `${index + 1}. ${item}`))
        .join("\n");
      return [{ id, type: "paragraph", text: body || "List" }];
    }
    case "headline-facts": {
      const facts = Array.isArray(section.facts) ? section.facts.filter(isRecord) : [];
      if (kind === "page") {
        const items = facts.map((fact, index) =>
          menuItem(text(fact.id) || `${id}-fact-${index + 1}`, text(fact.label) || "Fact", text(fact.value), articleHref),
        );
        const dek = text(section.dek);
        if (dek) items.unshift(menuItem(`${id}-dek`, text(section.kicker) || "Note", dek, articleHref));
        return [
          {
            id,
            type: "menu-shelf",
            heading: text(section.headline) || "Facts",
            items: items.length > 0 ? items : [menuItem(`${id}-item`, "Fact", "", articleHref)],
          },
        ];
      }
      const intro = [text(section.kicker), text(section.dek)].filter(Boolean).join(". ");
      const findings: Block = {
        id,
        type: "key-findings",
        title: text(section.headline) || "Facts",
        items: facts.length
          ? facts.map((fact) => `${text(fact.label) || "Fact"}: ${text(fact.value)}`.trim())
          : ["Fact"],
      };
      if (!intro) return [findings];
      const note: Block = { id: `${id}-dek`, type: "paragraph", text: intro };
      return [note, findings];
    }
    case "carousel": {
      const slides = (Array.isArray(section.slides) ? section.slides : []).filter(isRecord).map((slide, index) => {
        const card = storyFrom(slide, plate());
        return { ...card, id: card.id || `slide-${index + 1}` };
      });
      return [
        {
          id,
          type: "carousel",
          label: text(section.label),
          slides: slides.length > 0 ? slides : [{ id: `${id}-slide`, kicker: "", title: "Slide", dek: "", href: articleHref, ...plate() }],
        },
      ];
    }
    case "story-grid": {
      const fallback = plate();
      const lead = isRecord(section.lead) ? storyFrom({ ...section.lead, id: text(section.lead.id) || `${id}-lead` }, fallback) : null;
      const shorts = (Array.isArray(section.stories) ? section.stories : []).filter(isRecord).map((story, index) =>
        storyFrom({ ...story, id: text(story.id) || `${id}-story-${index + 1}` }, lead ?? fallback),
      );
      const stories = lead ? [lead, ...shorts] : shorts;
      return [
        {
          id,
          type: "story-grid",
          kicker: text(section.kicker),
          heading: lead?.title || text(section.heading) || "Stories",
          stories: stories.length > 0 ? stories : [{ id: `${id}-story`, kicker: "", title: "Story", dek: "", href: articleHref, ...fallback }],
        },
      ];
    }
    case "magazine-feature": {
      const card = storyFrom(section, plate());
      return [
        {
          id,
          type: "story-grid",
          kicker: text(section.kicker),
          heading: text(section.title) || "Feature",
          stories: [{ ...card, id: `${id}-story` }],
        },
      ];
    }
    case "category-tiles": {
      const tiles = (Array.isArray(section.tiles) ? section.tiles : []).filter(isRecord).map((tile, index) =>
        storyFrom({ ...tile, id: text(tile.id) || `${id}-tile-${index + 1}` }, plate()),
      );
      return [
        {
          id,
          type: "story-grid",
          kicker: "",
          heading: text(section.heading) || "Sections",
          stories: tiles.length > 0 ? tiles : [{ id: `${id}-story`, kicker: "", title: "Section", dek: "", href: articleHref, ...plate() }],
        },
      ];
    }
    case "menu-shelf":
      return [section as unknown as PageSection];
    default:
      return [
        menuShelfFromUnknown(id, type || "Section", text(section.dek) || text(section.summary) || text(section.text), articleHref),
      ];
  }
}

function menuShelfFromUnknown(id: string, label: string, dek: string, href: string): PageSection {
  return {
    id,
    type: "menu-shelf",
    heading: label || "Section",
    items: [menuItem(`${id}-item`, label || "Item", dek, href)],
  };
}

export function migrateFieldDeskDocument(value: unknown, status: "draft" | "published"): TwildaDocument {
  if (!isRecord(value)) throw new TwildaError("Field Desk document is not an object.", "invalid-document");
  if (value.kind !== "article" && value.kind !== "page") {
    throw new TwildaError("Field Desk document kind must be article or page.", "invalid-document");
  }
  const id = text(value.id);
  const slug = text(value.slug) || id;
  const base = {
    id,
    title: text(value.title) || "Untitled",
    slug,
    dek: text(value.dek),
    kicker: text(value.kicker),
    status,
    updatedAt: text(value.updatedAt) || new Date().toISOString(),
  };
  const articleHref = `/articles/${slug}`;
  const sections = Array.isArray(value.sections) ? value.sections.filter(isRecord) : [];
  const kind = value.kind;

  let doc: TwildaDocument;
  if (kind === "article") {
    const blocks = sections
      .flatMap((section) => migrateSection(section, articleHref, kind))
      .filter((part): part is Block => !isPage(part));
    doc = {
      ...base,
      kind: "article",
      byline: text(value.byline),
      blocks: blocks.length > 0 ? blocks : [{ id: "p-empty", type: "paragraph", text: "This article has no blocks yet." }],
    };
  } else {
    const pageSections = sections.flatMap((section) => migrateSection(section, articleHref, kind)).filter(isPage);
    doc = {
      ...base,
      kind: "page",
      sections: pageSections.length > 0 ? pageSections : [menuShelfFromUnknown("empty", "Section", "", "/")],
    };
  }

  const parsed = documentSchema.safeParse(doc);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new TwildaError(detail, "invalid-document");
  }
  return parsed.data;
}

function isPage(part: Block | PageSection): part is PageSection {
  return part.type === "carousel" || part.type === "story-grid" || part.type === "menu-shelf";
}
