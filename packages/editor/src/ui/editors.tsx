import { useCallback, useRef, useState } from "react";
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

function useCollapsed(ids: string[]) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const allCollapsed = ids.length > 0 && ids.every((id) => collapsed.has(id));
  const setAll = useCallback(
    (value: boolean) => setCollapsed(value ? new Set(ids) : new Set()),
    [ids],
  );
  return { collapsed, toggle, allCollapsed, setAll };
}

function clip(text: string, max = 70): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "Empty";
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function blockSummary(block: Block): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return clip(block.text);
    case "key-findings":
      return clip(block.title || block.findings[0]?.label || "");
    case "chart":
    case "callout":
      return clip(block.title);
    case "sources":
      return `${block.items.length} source${block.items.length === 1 ? "" : "s"}`;
    case "image":
      return clip(block.alt || block.caption || block.src);
    case "video":
    case "audio":
      return clip(block.caption || block.src);
    case "download":
      return clip(block.label);
    default:
      return "";
  }
}

export function BlockEditor({
  doc,
  media,
  onChange,
  onAdd,
  onRemove,
  onMove,
  onUploadImage,
}: {
  doc: ArticleDoc;
  media: MediaAsset[];
  onChange: (block: Block) => void;
  onAdd: (block: Block) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, to: number) => void;
  onUploadImage: (file: File) => Promise<MediaAsset | null>;
}) {
  const ids = doc.blocks.map((block) => block.id);
  const { collapsed, toggle, allCollapsed, setAll } = useCollapsed(ids);
  const moveBy = useCallback(
    (id: string, delta: number) => {
      const index = doc.blocks.findIndex((block) => block.id === id);
      onMove(id, index + delta);
    },
    [doc.blocks, onMove],
  );

  return (
    <div className="stack">
      {doc.blocks.length > 1 ? (
        <div className="outline-bar">
          <p className="hint">{doc.blocks.length} blocks</p>
          <button
            type="button"
            className="btn"
            data-testid="collapse-all"
            onClick={() => setAll(!allCollapsed)}
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>
      ) : null}
      <ReorderList order={ids} onMove={onMove}>
        {doc.blocks.map((block, index) => (
          <ItemFrame
            key={block.id}
            id={block.id}
            index={index}
            count={doc.blocks.length}
            label={blockLabel(block.type)}
            summary={blockSummary(block)}
            collapsed={collapsed.has(block.id)}
            onToggle={() => toggle(block.id)}
            onMoveBy={(delta) => moveBy(block.id, delta)}
            onRemove={() => onRemove(block.id)}
          >
            <BlockFields block={block} media={media} onChange={onChange} onUploadImage={onUploadImage} />
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
  const ids = doc.sections.map((section) => section.id);
  const { collapsed, toggle } = useCollapsed(ids);
  const moveBy = useCallback(
    (id: string, delta: number) => {
      const index = doc.sections.findIndex((section) => section.id === id);
      onMove(id, index + delta);
    },
    [doc.sections, onMove],
  );

  return (
    <div className="stack">
      <ReorderList order={ids} onMove={onMove}>
        {doc.sections.map((section, index) => (
          <ItemFrame
            key={section.id}
            id={section.id}
            index={index}
            count={doc.sections.length}
            label={sectionLabel(section.type)}
            summary={clip(section.label)}
            collapsed={collapsed.has(section.id)}
            onToggle={() => toggle(section.id)}
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
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details className="adder" ref={ref}>
      <summary data-testid={testId}>{title}</summary>
      <ul className="chooser">
        {options.map((option) => (
          <li key={option.type}>
            <button type="button" data-testid={`choose-${option.type}`} onClick={() => {
                onPick(option.type);
                if (ref.current) ref.current.open = false;
              }}
            >
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
  onUploadImage,
}: {
  block: Block;
  media: MediaAsset[];
  onChange: (block: Block) => void;
  onUploadImage: (file: File) => Promise<MediaAsset | null>;
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
          <Field label="Title" value={block.title} testId={`title-${block.id}`} onChange={(title) => onChange({ ...block, title })} />
          {block.findings.map((finding, index) => (
            <div className="subrow" key={finding.id}>
              <Field
                label="Label"
                value={finding.label}
                testId={`finding-label-${finding.id}`}
                onChange={(label) => {
                  const findings = block.findings.slice();
                  findings[index] = { ...finding, label };
                  onChange({ ...block, findings });
                }}
              />
              <Field
                label="Detail"
                value={finding.detail}
                multiline
                testId={`finding-detail-${finding.id}`}
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
            data-testid={`add-finding-${block.id}`}
            onClick={() =>
              onChange({
                ...block,
                findings: [...block.findings, { id: createId("finding"), label: "", detail: "" }],
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
          <Field label="Title" value={block.title} testId={`title-${block.id}`} onChange={(title) => onChange({ ...block, title })} />
          <Field
            label="Chart embed link (https://)"
            value={block.src}
            testId={`src-${block.id}`}
            onChange={(src) => onChange({ ...block, src })}
          />
          <Field
            label="Alt text (what the chart shows)"
            value={block.alt}
            multiline
            testId={`alt-${block.id}`}
            onChange={(alt) => onChange({ ...block, alt })}
          />
          <Field label="Caption and source line" value={block.caption} multiline onChange={(caption) => onChange({ ...block, caption })} />
        </>
      );
    case "callout":
      return (
        <>
          <Field label="Title" value={block.title} testId={`title-${block.id}`} onChange={(title) => onChange({ ...block, title })} />
          <Field label="Text" value={block.text} multiline testId={`text-${block.id}`} onChange={(text) => onChange({ ...block, text })} />
        </>
      );
    case "sources":
      return (
        <>
          {block.items.map((item, index) => (
            <div className="subrow" key={item.id}>
              <Field
                label="Citation"
                value={item.label}
                multiline
                testId={`source-label-${item.id}`}
                onChange={(label) => {
                  const items = block.items.slice();
                  items[index] = { ...item, label };
                  onChange({ ...block, items });
                }}
              />
              <Field
                label="Link (https://)"
                value={item.href}
                testId={`source-href-${item.id}`}
                onChange={(href) => {
                  const items = block.items.slice();
                  items[index] = { ...item, href };
                  onChange({ ...block, items });
                }}
              />
              <button
                type="button"
                className="btn"
                disabled={block.items.length === 1}
                onClick={() => onChange({ ...block, items: block.items.filter((entry) => entry.id !== item.id) })}
              >
                Remove source
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            data-testid={`add-source-${block.id}`}
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { id: createId("source"), label: "", href: "https://" }],
              })
            }
          >
            Add source
          </button>
        </>
      );
    case "image": {
      const isUpload = media.some((item) => item.path === block.src);
      return (
        <>
          <label className="field btn file-btn">
            Choose a photo or image
            <input
              data-testid={`upload-${block.id}`}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void onUploadImage(file).then((asset) => {
                  if (asset) onChange({ ...block, src: asset.path });
                });
              }}
            />
          </label>
          {media.length > 0 ? (
            <label className="field">
              <span>Or pick an earlier upload</span>
              <select
                value={isUpload ? block.src : ""}
                onChange={(event) => {
                  if (event.target.value) onChange({ ...block, src: event.target.value });
                }}
              >
                <option value="">None selected</option>
                {media.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Field
            label="Or an image link (https://)"
            value={isUpload ? "" : block.src}
            testId={`src-${block.id}`}
            onChange={(src) => onChange({ ...block, src })}
          />
          <Field label="Alt text" value={block.alt} testId={`alt-${block.id}`} onChange={(alt) => onChange({ ...block, alt })} />
          <Field label="Caption" value={block.caption} multiline onChange={(caption) => onChange({ ...block, caption })} />
        </>
      );
    }
    case "video":
    case "audio":
      return (
        <>
          <Field label="Link (https://)" value={block.src} onChange={(src) => onChange({ ...block, src })} />
          <Field label="Caption" value={block.caption} multiline onChange={(caption) => onChange({ ...block, caption })} />
        </>
      );
    case "download":
      return (
        <>
          <Field label="Label" value={block.label} testId={`label-${block.id}`} onChange={(label) => onChange({ ...block, label })} />
          <Field label="File link (https://)" value={block.href} testId={`href-${block.id}`} onChange={(href) => onChange({ ...block, href })} />
          <Field
            label="Description"
            value={block.description ?? ""}
            multiline
            onChange={(description) => onChange({ ...block, description })}
          />
        </>
      );
    default: {
      const exhaustive: never = block;
      throw new Error(`Unknown block ${String(exhaustive)}`);
    }
  }
}
