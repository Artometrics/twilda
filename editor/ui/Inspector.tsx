import type { Block, PageSection, TwildaDocument } from "@twilda/core";
import { documentParts, partLabel, withParts, type Part } from "../../src/schema/templates";

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function Lines({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="stack">
      {items.map((item, index) => (
        <Field
          key={`${label}-${index}`}
          label={`${label} ${index + 1}`}
          value={item}
          multiline
          onChange={(value) => {
            const next = items.slice();
            next[index] = value;
            onChange(next);
          }}
        />
      ))}
      <button type="button" onClick={() => onChange([...items, ""])}>
        Add {label.toLowerCase()}
      </button>
    </div>
  );
}

function PartFields({ part, onChange }: { part: Part; onChange: (part: Part) => void }) {
  switch (part.type) {
    case "heading":
      return (
        <>
          <label className="field">
            <span>Level</span>
            <select
              value={part.level}
              onChange={(event) => onChange({ ...part, level: event.target.value === "3" ? 3 : 2 })}
            >
              <option value={2}>Heading 2</option>
              <option value={3}>Heading 3</option>
            </select>
          </label>
          <Field label="Text" value={part.text} onChange={(text) => onChange({ ...part, text })} />
        </>
      );
    case "paragraph":
      return <Field label="Text" value={part.text} multiline onChange={(text) => onChange({ ...part, text })} />;
    case "key-findings":
      return (
        <>
          <Field label="Title" value={part.title} onChange={(title) => onChange({ ...part, title })} />
          <Lines label="Finding" items={part.items} onChange={(items) => onChange({ ...part, items })} />
        </>
      );
    case "chart":
      return (
        <>
          <Field label="Title" value={part.title} onChange={(title) => onChange({ ...part, title })} />
          <Field label="CSV path" value={part.dataPath} onChange={(dataPath) => onChange({ ...part, dataPath })} />
          <Field label="Alt text" value={part.alt} multiline onChange={(alt) => onChange({ ...part, alt })} />
          <Field label="Caption" value={part.caption} multiline onChange={(caption) => onChange({ ...part, caption })} />
        </>
      );
    case "callout":
      return (
        <>
          <Field label="Title" value={part.title} onChange={(title) => onChange({ ...part, title })} />
          <Field label="Text" value={part.text} multiline onChange={(text) => onChange({ ...part, text })} />
        </>
      );
    case "sources":
      return (
        <>
          <Field label="Title" value={part.title} onChange={(title) => onChange({ ...part, title })} />
          {part.items.map((item, index) => (
            <div key={item.id}>
              <Field
                label="Citation"
                value={item.label}
                onChange={(label) => {
                  const items = part.items.slice();
                  items[index] = { ...item, label };
                  onChange({ ...part, items });
                }}
              />
              <Field
                label="Link"
                value={item.href}
                onChange={(href) => {
                  const items = part.items.slice();
                  items[index] = { ...item, href };
                  onChange({ ...part, items });
                }}
              />
            </div>
          ))}
        </>
      );
    case "image":
      return (
        <>
          <Field label="Image path" value={part.src} onChange={(src) => onChange({ ...part, src })} />
          <Field label="Alt text" value={part.alt} onChange={(alt) => onChange({ ...part, alt })} />
          <Field label="Caption" value={part.caption} multiline onChange={(caption) => onChange({ ...part, caption })} />
          <label className="field">
            <span>Role</span>
            <select value={part.role} onChange={(event) => onChange({ ...part, role: event.target.value === "banner" ? "banner" : "figure" })}>
              <option value="figure">Figure</option>
              <option value="banner">Banner</option>
            </select>
          </label>
        </>
      );
    case "embed":
      return (
        <>
          <label className="field">
            <span>Kind</span>
            <select value={part.kind} onChange={(event) => onChange({ ...part, kind: event.target.value === "audio" ? "audio" : "video" })}>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </label>
          <Field label="Title" value={part.title} onChange={(title) => onChange({ ...part, title })} />
          <Field label="Link" value={part.src} onChange={(src) => onChange({ ...part, src })} />
          <Field label="Caption" value={part.caption} multiline onChange={(caption) => onChange({ ...part, caption })} />
        </>
      );
    case "download":
      return (
        <>
          <Field label="Label" value={part.label} onChange={(label) => onChange({ ...part, label })} />
          <Field label="Link" value={part.href} onChange={(href) => onChange({ ...part, href })} />
          <Field label="Description" value={part.description} multiline onChange={(description) => onChange({ ...part, description })} />
        </>
      );
    case "carousel":
      return (
        <>
          <Field label="Label" value={part.label} onChange={(label) => onChange({ ...part, label })} />
          {part.slides.map((slide, index) => (
            <div key={slide.id}>
              <Field
                label="Slide title"
                value={slide.title}
                onChange={(title) => {
                  const slides = part.slides.slice();
                  slides[index] = { ...slide, title };
                  onChange({ ...part, slides });
                }}
              />
              <Field
                label="Slide link"
                value={slide.href}
                onChange={(href) => {
                  const slides = part.slides.slice();
                  slides[index] = { ...slide, href };
                  onChange({ ...part, slides });
                }}
              />
            </div>
          ))}
        </>
      );
    case "story-grid":
      return (
        <>
          <Field label="Kicker" value={part.kicker} onChange={(kicker) => onChange({ ...part, kicker })} />
          <Field label="Heading" value={part.heading} onChange={(heading) => onChange({ ...part, heading })} />
          {part.stories.map((story, index) => (
            <Field
              key={story.id}
              label="Story title"
              value={story.title}
              onChange={(title) => {
                const stories = part.stories.slice();
                stories[index] = { ...story, title };
                onChange({ ...part, stories });
              }}
            />
          ))}
        </>
      );
    case "menu-shelf":
      return (
        <>
          <Field label="Heading" value={part.heading} onChange={(heading) => onChange({ ...part, heading })} />
          {part.items.map((item, index) => (
            <div key={item.id}>
              <Field
                label="Item label"
                value={item.label}
                onChange={(label) => {
                  const items = part.items.slice();
                  items[index] = { ...item, label };
                  onChange({ ...part, items });
                }}
              />
              <Field
                label="Item link"
                value={item.href}
                onChange={(href) => {
                  const items = part.items.slice();
                  items[index] = { ...item, href };
                  onChange({ ...part, items });
                }}
              />
            </div>
          ))}
        </>
      );
    default:
      return <p className="hint">This part is edited in the desk. The dev inspector covers the original parts only.</p>;
  }
}

export function Inspector({
  doc,
  selectedId,
  onChange,
}: {
  doc: TwildaDocument;
  selectedId: string | null;
  onChange: (doc: TwildaDocument) => void;
}) {
  const parts = documentParts(doc);
  const part = parts.find((item) => item.id === selectedId) ?? null;
  return (
    <section className="inspector" aria-label="Fields">
      <h2>{part ? partLabel(part.type) : "Fields"}</h2>
      {part ? (
        <PartFields
          part={part}
          onChange={(next) => {
            onChange(withParts(doc, parts.map((item) => (item.id === next.id ? next : item)) as Array<Block | PageSection>));
          }}
        />
      ) : (
        <p>Select a section to edit its fields.</p>
      )}
    </section>
  );
}
