import { renderDocument } from "../../src/render/document";
import type { ContentDocument } from "../../src/schema/sections";

export function Preview({ doc }: { doc: ContentDocument }) {
  return (
    <div className="proof-scroll">
      <div className="proof" dangerouslySetInnerHTML={{ __html: renderDocument(doc) }} />
    </div>
  );
}
