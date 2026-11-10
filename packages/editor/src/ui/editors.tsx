import { useCallback } from "react";
import {
  BLOCK_CATALOG,
  SECTION_CATALOG,
  blockLabel,
  createBlock,
  createId,
  createSection,
  sectionLabel,
  type ArticleDoc,
  type Block,
  type MediaAsset,
  type PageDoc,
  type PageSection,
} from "../model";
import { Field } from "./Field";
import { ItemFrame, ReorderList } from "./Reorder";

export function BlockEditor({
  doc,
  media,
  onChange,
  onAdd,
  onRemove,
  onMove,
}: {
  doc: ArticleDoc;
  media: MediaAsset[];
  onChange: (block: Block) => void;
  onAdd: (block: Block) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, to: number) => void;
}) {
  const moveBy = useCallback(
    (id: string, delta: number) => {
      const index = doc.blocks.findIndex((block) => block.id === id);
      onMove(id, index + delta);
    },
    [doc.blocks, onMove],
  );

  return (
    <div className="stack">
      <ReorderList order={doc.blocks.map((block) => block.id)} onMove={onMove}>
        {doc.blocks.map((block, index) => (
          <ItemFrame
            key={block.id}
            id={block.id}
            index={index}
            count={doc.blocks.length}
            label={blockLabel(block.type)}
            onMoveBy={(delta) => moveBy(block.id, delta)}
            onRemove={() => onRemove(block.id)}
          >
            <BlockFields block={block} media={media} onChange={onChange} />
          </ItemFrame>
        ))}
      </ReorderList>
      <AddChooser
        title="Add a block"
        testId="add-block"
        options={BLOCK_CATALOG}
        onPick={(type) => onAdd(createBlock(type))}
      />
    </div>
  );
}

export function SectionEditor({
  doc,
  onChange,
  onAdd,
  onRemove,
  onMove,
}: {
  doc: PageDoc;
  onChange: (section: PageSection) => void;
  onAdd: (section: PageSection) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, to: number) => void;
}) {
  const moveBy = useCallback(
    (id: string, delta: number) => {
      const index = doc.sections.findIndex((section) => section.id === id);
      onMove(id, index + delta);
    },
    [doc.sections, onMove],
  );

  return (
    <div className="stack">
      <ReorderList order={doc.sections.map((section) => section.id)} onMove={onMove}>
        {doc.sections.map((section, index) => (
          <ItemFrame
            key={section.id}
            id={section.id}
            index={index}
            count={doc.sections.length}
            label={sectionLabel(section.type)}
            onMoveBy={(delta) => moveBy(section.id, delta)}
            onRemove={() => onRemove(section.id)}
          >
            <Field label="Label" value={section.label} onChange={(label) => onChange({ ...section, label })} />
            <Field
              label="Summary"
              value={section.summary}
              multiline
              onChange={(summary) => onChange({ ...section, summary })}
            />
          </ItemFrame>
        ))}
      </ReorderList>
      <AddChooser
        title="Add a section"
        testId="add-section"
        options={SECTION_CATALOG}
        onPick={(type) => onAdd(createSection(type))}
      />
    </div>
  );
}

function AddChooser<T extends string>({
  title,
  testId,
  options,
  onPick,
}: {
  title: string;
  testId: string;
  options: readonly { type: T; label: string; hint: string }[];
  onPick: (type: T) => void;
}) {
  return (
    <details className="adder">
      <summary data-testid={testId}>{title}</summary>
      <ul className="chooser">
        {options.map((option) => (
          <li key={option.type}>
            <button type="button" data-testid={`choose-${option.type}`} onClick={() => onPick(option.type)}>
              <strong>{option.label}</strong>
              <span>{option.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function BlockFields({
  block,
  media,
  onChange,
}: {
  block: Block;
  media: MediaAsset[];
  onChange: (block: Block) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <>
          <label className="field">
            <span>Level</span>
            <select
              value={block.level}
              onChange={(event) => onChange({ ...block, level: event.target.value === "3" ? 3 : 2 })}
            >
              <option value={2}>Heading 2</option>
              <option value={3}>Heading 3</option>
            </select>
          </label>
          <Field label="Text" value={block.text} testId={`text-${block.id}`} onChange={(text) => onChange({ ...block, text })} />
        </>
      );
    case "paragraph":
      return (
        <Field
          label="Text"
          value={block.text}
          multiline
          testId={`text-${block.id}`}
          onChange={(text) => onChange({ ...block, text })}
        />
      );
    case "key-findings":
      return (
        <>
          <Field label="Title" value={block.title} onChange={(title) => onChange({ ...block, title })} />
          {block.findings.map((finding, index) => (
            <div className="subrow" key={finding.id}>
              <Field
                label="Label"
                value={finding.label}
                onChange={(label) => {
                  const findings = block.findings.slice();
                  findings[index] = { ...finding, label };
                  onChange({ ...block, findings });
                }}
              />
              <Field
                label="Detail"
                value={finding.detail}
                onChange={(detail) => {
                  const findings = block.findings.slice();
                  findings[index] = { ...finding, detail };
                  onChange({ ...block, findings });
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => onChange({ ...block, findings: block.findings.filter((item) => item.id !== finding.id) })}
                disabled={block.findings.length === 1}
              >
                Remove finding
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() =>
              onChange({
                ...block,
                findings: [...block.findings, { id: createId("finding"), label: "Label", detail: "Detail" }],
              })
            }
          >
            Add finding
          </button>
        </>
      );
    case "chart":
      return (
        <>
          <Field label="Title" value={block.title} onChange={(title) => onChange({ ...block, title })} />
          <Field label="Caption" value={block.caption} multiline onChange={(caption) => onChange({ ...block, caption })} />
          <Field label="Data path" value={block.src} onChange={(src) => onChange({ ...block, src })} />
        </>
      );
    case "callout":
      return (
        <>
          <Field label="Title" value={block.title} onChange={(title) => onChange({ ...block, title })} />
          <Field label="Text" value={block.text} multiline onChange={(text) => onChange({ ...block, text })} />
        </>
      );
    case "sources":
      return (
        <>
          {block.items.map((item, index) => (
            <div className="subrow" key={item.id}>
              <Field
                label="Source"
                value={item.label}
                onChange={(label) => {
                  const items = block.items.slice();
                  items[index] = { ...item, label };
                  onChange({ ...block, items });
                }}
              />
              <Field
                label="Path"
                value={item.href}
                onChange={(href) => {
                  const items = block.items.slice();
                  items[index] = { ...item, href };
                  onChange({ ...block, items });
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { id: createId("source"), label: "Source", href: "/articles/lumen-rail" }],
              })
            }
          >
            Add source
          </button>
        </>
      );
    case "image":
      return (
        <>
          <label className="field">
            <span>File</span>
            <select value={block.src} onChange={(event) => onChange({ ...block, src: event.target.value })}>
              <option value="">Choose an upload</option>
              {block.src && !media.some((item) => item.path === block.src) ? (
                <option value={block.src}>{block.src}</option>
              ) : null}
              {media.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Alt text" value={block.alt} onChange={(alt) => onChange({ ...block, alt })} />
          <Field label="Caption" value={block.caption} multiline onChange={(caption) => onChange({ ...block, caption })} />
        </>
      );
    case "video":
    case "audio":
      return (
        <>
          <Field label="Path" value={block.src} onChange={(src) => onChange({ ...block, src })} />
          <Field label="Caption" value={block.caption} multiline onChange={(caption) => onChange({ ...block, caption })} />
        </>
      );
    case "download":
      return (
        <>
          <Field label="Label" value={block.label} onChange={(label) => onChange({ ...block, label })} />
          <Field label="Path" value={block.href} onChange={(href) => onChange({ ...block, href })} />
        </>
      );
    default: {
      const exhaustive: never = block;
      throw new Error(`Unknown block ${String(exhaustive)}`);
    }
  }
}
