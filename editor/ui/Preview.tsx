import type { TwildaDocument } from "@twilda/core";
import { renderDocument } from "@twilda/core";

export function Preview({ doc }: { doc: TwildaDocument }) {
  return (
    <div className="proof-scroll">
      <div className="proof" dangerouslySetInnerHTML={{ __html: renderDocument(doc) }} />
    </div>
  );
}
