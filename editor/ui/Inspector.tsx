import { useId } from "react";
import { moveItem } from "../../src/schema/reorder";
import {
  SECTION_LABELS,
  type CategoryTilesSection,
  type ContentDocument,
  type HeadlineFactsSection,
  type Section,
  type StoryGridSection,
} from "../../src/schema/sections";

function Field({
  label,
  value,
  onChange,
  multiline = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={4}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function StringItems({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="stack">
      {items.map((item, index) => (
        <div className="card" key={`${index}-${items.length}`}>
          <Field
            label={`Item ${index + 1}`}
            value={item}
            onChange={(value) => {
              const next = items.slice();
              next[index] = value;
              onChange(next);
            }}
          />
          <div className="inline-actions">
            <button type="button" disabled={index === 0} onClick={() => onChange(moveItem(items, index, index - 1))}>
              Up
            </button>
            <button
              type="button"
              disabled={index === items.length - 1}
              onClick={() => onChange(moveItem(items, index, index + 1))}
            >
              Down
            </button>
            <button
              type="button"
              disabled={items.length <= 1}
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, "New item"])}>
        Add item
      </button>
    </div>
  );
}

function SectionFields({
  section,
  onChange,
}: {
  section: Section;
  onChange: (section: Section) => void;
}) {
  switch (section.type) {
    case "carousel":
      return (
        <div className="stack">
          <Field label="Label" value={section.label} onChange={(label) => onChange({ ...section, label })} />
          {section.slides.map((slide, index) => (
            <div className="card" key={slide.id}>
              <Field
                label={`Slide ${index + 1} kicker`}
                value={slide.kicker}
                onChange={(kicker) => {
                  const slides = section.slides.slice();
                  slides[index] = { ...slide, kicker };
                  onChange({ ...section, slides });
                }}
              />
              <Field
                label="Title"
                value={slide.title}
                onChange={(title) => {
                  const slides = section.slides.slice();
                  slides[index] = { ...slide, title };
                  onChange({ ...section, slides });
                }}
              />
              <Field
                label="Dek"
                value={slide.dek}
                multiline
                onChange={(dek) => {
                  const slides = section.slides.slice();
                  slides[index] = { ...slide, dek };
                  onChange({ ...section, slides });
                }}
              />
              <Field
                label="Link"
                value={slide.href}
                onChange={(href) => {
                  const slides = section.slides.slice();
                  slides[index] = { ...slide, href };
                  onChange({ ...section, slides });
                }}
              />
              <Field
                label="Image path"
                value={slide.image}
                onChange={(image) => {
                  const slides = section.slides.slice();
                  slides[index] = { ...slide, image };
                  onChange({ ...section, slides });
                }}
              />
              <Field
                label="Image description"
                value={slide.imageAlt}
                onChange={(imageAlt) => {
                  const slides = section.slides.slice();
                  slides[index] = { ...slide, imageAlt };
                  onChange({ ...section, slides });
                }}
              />
              <div className="inline-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onChange({ ...section, slides: moveItem(section.slides, index, index - 1) })}
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={index === section.slides.length - 1}
                  onClick={() => onChange({ ...section, slides: moveItem(section.slides, index, index + 1) })}
                >
                  Down
                </button>
                <button
                  type="button"
                  disabled={section.slides.length <= 1}
                  onClick={() =>
                    onChange({ ...section, slides: section.slides.filter((item) => item.id !== slide.id) })
                  }
                >
                  Remove slide
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...section,
                slides: [
                  ...section.slides,
                  {
                    id: `slide-${crypto.randomUUID().slice(0, 8)}`,
                    kicker: "Story",
                    title: "New slide",
                    dek: "",
                    href: "/articles/lumen-rail",
                    image: "/media/plate-signal.svg",
                    imageAlt: "Abstract signal plate",
                  },
                ],
              })
            }
          >
            Add slide
          </button>
        </div>
      );
    case "story-grid":
      return <StoryGridFields section={section} onChange={onChange} />;
    case "headline-facts":
      return <FactsFields section={section} onChange={onChange} />;
    case "magazine-feature":
      return (
        <>
          <Field label="Kicker" value={section.kicker} onChange={(kicker) => onChange({ ...section, kicker })} />
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          <Field label="Dek" value={section.dek} multiline onChange={(dek) => onChange({ ...section, dek })} />
          <Field label="Byline" value={section.byline} onChange={(byline) => onChange({ ...section, byline })} />
          <Field label="Link" value={section.href} onChange={(href) => onChange({ ...section, href })} />
          <Field label="Image path" value={section.image} onChange={(image) => onChange({ ...section, image })} />
          <Field
            label="Image description"
            value={section.imageAlt}
            onChange={(imageAlt) => onChange({ ...section, imageAlt })}
          />
        </>
      );
    case "category-tiles":
      return <TileFields section={section} onChange={onChange} />;
    case "heading":
      return (
        <>
          <label className="field">
            <span>Level</span>
            <select
              value={section.level}
              onChange={(event) =>
                onChange({ ...section, level: event.target.value === "3" ? 3 : 2 })
              }
            >
              <option value="2">Heading</option>
              <option value="3">Subheading</option>
            </select>
          </label>
          <Field label="Text" value={section.text} onChange={(text) => onChange({ ...section, text })} />
        </>
      );
    case "paragraph":
      return (
        <Field
          label="Text"
          value={section.text}
          multiline
          onChange={(text) => onChange({ ...section, text })}
        />
      );
    case "pull-quote":
      return (
        <>
          <Field label="Quote" value={section.quote} multiline onChange={(quote) => onChange({ ...section, quote })} />
          <Field
            label="Attribution"
            value={section.attribution}
            onChange={(attribution) => onChange({ ...section, attribution })}
          />
        </>
      );
    case "figure":
      return (
        <>
          <Field label="Image path" value={section.image} onChange={(image) => onChange({ ...section, image })} />
          <Field
            label="Image description"
            value={section.imageAlt}
            onChange={(imageAlt) => onChange({ ...section, imageAlt })}
          />
          <Field label="Caption" value={section.caption} onChange={(caption) => onChange({ ...section, caption })} />
        </>
      );
    case "list":
      return (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={section.ordered}
              onChange={(event) => onChange({ ...section, ordered: event.target.checked })}
            />
            Numbered list
          </label>
          <StringItems items={section.items} onChange={(items) => onChange({ ...section, items })} />
        </>
      );
    case "callout":
      return (
        <>
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          <Field label="Text" value={section.text} multiline onChange={(text) => onChange({ ...section, text })} />
        </>
      );
    default: {
      const exhaustive: never = section;
      return exhaustive;
    }
  }
}

function StoryGridFields({
  section,
  onChange,
}: {
  section: StoryGridSection;
  onChange: (section: Section) => void;
}) {
  const lead = section.lead;
  return (
    <>
      <Field label="Kicker" value={section.kicker} onChange={(kicker) => onChange({ ...section, kicker })} />
      <Field
        label="Lead kicker"
        value={lead.kicker}
        onChange={(kicker) => onChange({ ...section, lead: { ...lead, kicker } })}
      />
      <Field
        label="Lead title"
        value={lead.title}
        onChange={(title) => onChange({ ...section, lead: { ...lead, title } })}
      />
      <Field
        label="Lead dek"
        value={lead.dek}
        multiline
        onChange={(dek) => onChange({ ...section, lead: { ...lead, dek } })}
      />
      <Field
        label="Lead link"
        value={lead.href}
        onChange={(href) => onChange({ ...section, lead: { ...lead, href } })}
      />
      <Field
        label="Lead image"
        value={lead.image}
        onChange={(image) => onChange({ ...section, lead: { ...lead, image } })}
      />
      <Field
        label="Lead image description"
        value={lead.imageAlt}
        onChange={(imageAlt) => onChange({ ...section, lead: { ...lead, imageAlt } })}
      />
      <Field
        label="Lead byline"
        value={lead.byline}
        onChange={(byline) => onChange({ ...section, lead: { ...lead, byline } })}
      />
      {section.stories.map((story, index) => (
        <div className="card" key={story.id}>
          <Field
            label={`Short ${index + 1} kicker`}
            value={story.kicker}
            onChange={(kicker) => {
              const stories = section.stories.slice();
              stories[index] = { ...story, kicker };
              onChange({ ...section, stories });
            }}
          />
          <Field
            label="Title"
            value={story.title}
            onChange={(title) => {
              const stories = section.stories.slice();
              stories[index] = { ...story, title };
              onChange({ ...section, stories });
            }}
          />
          <Field
            label="Dek"
            value={story.dek}
            onChange={(dek) => {
              const stories = section.stories.slice();
              stories[index] = { ...story, dek };
              onChange({ ...section, stories });
            }}
          />
          <Field
            label="Link"
            value={story.href}
            onChange={(href) => {
              const stories = section.stories.slice();
              stories[index] = { ...story, href };
              onChange({ ...section, stories });
            }}
          />
          <div className="inline-actions">
            <button
              type="button"
              disabled={section.stories.length <= 1}
              onClick={() => onChange({ ...section, stories: section.stories.filter((item) => item.id !== story.id) })}
            >
              Remove short
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...section,
            stories: [
              ...section.stories,
              {
                id: `story-${crypto.randomUUID().slice(0, 8)}`,
                kicker: "Short",
                title: "New short",
                dek: "",
                href: "/articles/lumen-rail",
              },
            ],
          })
        }
      >
        Add short
      </button>
    </>
  );
}

function FactsFields({
  section,
  onChange,
}: {
  section: HeadlineFactsSection;
  onChange: (section: Section) => void;
}) {
  return (
    <>
      <Field label="Kicker" value={section.kicker} onChange={(kicker) => onChange({ ...section, kicker })} />
      <Field label="Headline" value={section.headline} onChange={(headline) => onChange({ ...section, headline })} />
      <Field label="Dek" value={section.dek} multiline onChange={(dek) => onChange({ ...section, dek })} />
      {section.facts.map((fact, index) => (
        <div className="card" key={fact.id}>
          <Field
            label={`Fact ${index + 1} label`}
            value={fact.label}
            onChange={(label) => {
              const facts = section.facts.slice();
              facts[index] = { ...fact, label };
              onChange({ ...section, facts });
            }}
          />
          <Field
            label="Value"
            value={fact.value}
            onChange={(value) => {
              const facts = section.facts.slice();
              facts[index] = { ...fact, value };
              onChange({ ...section, facts });
            }}
          />
          <button
            type="button"
            disabled={section.facts.length <= 1}
            onClick={() => onChange({ ...section, facts: section.facts.filter((item) => item.id !== fact.id) })}
          >
            Remove fact
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...section,
            facts: [
              ...section.facts,
              { id: `fact-${crypto.randomUUID().slice(0, 8)}`, label: "Label", value: "Value" },
            ],
          })
        }
      >
        Add fact
      </button>
    </>
  );
}

function TileFields({
  section,
  onChange,
}: {
  section: CategoryTilesSection;
  onChange: (section: Section) => void;
}) {
  return (
    <>
      <Field label="Heading" value={section.heading} onChange={(heading) => onChange({ ...section, heading })} />
      {section.tiles.map((tile, index) => (
        <div className="card" key={tile.id}>
          <Field
            label={`Tile ${index + 1} title`}
            value={tile.title}
            onChange={(title) => {
              const tiles = section.tiles.slice();
              tiles[index] = { ...tile, title };
              onChange({ ...section, tiles });
            }}
          />
          <Field
            label="Dek"
            value={tile.dek}
            onChange={(dek) => {
              const tiles = section.tiles.slice();
              tiles[index] = { ...tile, dek };
              onChange({ ...section, tiles });
            }}
          />
          <Field
            label="Link"
            value={tile.href}
            onChange={(href) => {
              const tiles = section.tiles.slice();
              tiles[index] = { ...tile, href };
              onChange({ ...section, tiles });
            }}
          />
          <Field
            label="Image path"
            value={tile.image}
            onChange={(image) => {
              const tiles = section.tiles.slice();
              tiles[index] = { ...tile, image };
              onChange({ ...section, tiles });
            }}
          />
          <Field
            label="Image description"
            value={tile.imageAlt}
            onChange={(imageAlt) => {
              const tiles = section.tiles.slice();
              tiles[index] = { ...tile, imageAlt };
              onChange({ ...section, tiles });
            }}
          />
          <button
            type="button"
            disabled={section.tiles.length <= 2}
            onClick={() => onChange({ ...section, tiles: section.tiles.filter((item) => item.id !== tile.id) })}
          >
            Remove tile
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...section,
            tiles: [
              ...section.tiles,
              {
                id: `tile-${crypto.randomUUID().slice(0, 8)}`,
                title: "New door",
                dek: "",
                href: "/articles/lumen-rail",
                image: "/media/plate-archive.svg",
                imageAlt: "Abstract archive plate",
              },
            ],
          })
        }
      >
        Add tile
      </button>
    </>
  );
}

export function Inspector({
  doc,
  selectedId,
  onChange,
}: {
  doc: ContentDocument;
  selectedId: string | null;
  onChange: (doc: ContentDocument) => void;
}) {
  const section = doc.sections.find((item) => item.id === selectedId) ?? null;
  const publicPath = doc.id === "home" ? "/" : `/articles/${doc.slug}`;

  return (
    <aside className="inspector">
      <div className="inspector-head">
        <h2>Document</h2>
      </div>
      <Field label="Title" value={doc.title} onChange={(title) => onChange({ ...doc, title })} />
      <Field label="Kicker" value={doc.kicker} onChange={(kicker) => onChange({ ...doc, kicker })} />
      <Field label="Dek" value={doc.dek} multiline onChange={(dek) => onChange({ ...doc, dek })} />
      <Field label="Byline" value={doc.byline} onChange={(byline) => onChange({ ...doc, byline })} />
      <Field
        label="Slug"
        value={doc.slug}
        disabled={doc.id === "home"}
        onChange={(slug) => onChange({ ...doc, slug })}
      />
      <p className="hint">Public path after the next static build: {publicPath}</p>
      {section ? (
        <>
          <div className="inspector-head">
            <h2>{SECTION_LABELS[section.type]}</h2>
          </div>
          <SectionFields
            section={section}
            onChange={(next) =>
              onChange({
                ...doc,
                sections: doc.sections.map((item) => (item.id === next.id ? next : item)),
              })
            }
          />
        </>
      ) : (
        <p className="hint">Select a section to edit its fields.</p>
      )}
    </aside>
  );
}
