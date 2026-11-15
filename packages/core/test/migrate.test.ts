import assert from "node:assert/strict";
import test from "node:test";
import { migrateFieldDeskDocument } from "../src/migrate";

test("field desk sections become contract blocks and keep the words", () => {
  const doc = migrateFieldDeskDocument(
    {
      id: "lumen-rail",
      kind: "article",
      title: "Lumen Rail",
      slug: "lumen-rail",
      dek: "A sample.",
      kicker: "Franchise",
      byline: "Desk",
      updatedAt: "2026-11-09T16:00:00.000Z",
      sections: [
        { id: "p1", type: "paragraph", text: "The night timetable is a public document." },
        {
          id: "facts",
          type: "headline-facts",
          kicker: "The sheet",
          headline: "What the concession records",
          dek: "Structured facts stay in fields.",
          facts: [{ id: "f1", label: "Story year", value: "1978" }],
        },
        { id: "q1", type: "pull-quote", quote: "If the sheet is public, the yard does not get to be a rumor.", attribution: "Clause 4" },
        { id: "list", type: "list", ordered: true, items: ["Cars wait under the shed."] },
        { id: "fig", type: "figure", image: "/media/plate-yard.svg", imageAlt: "Yard plate", caption: "The yard." },
      ],
    },
    "published",
  );
  assert.equal(doc.kind, "article");
  if (doc.kind !== "article") return;
  assert.equal(doc.status, "published");
  assert.match(JSON.stringify(doc.blocks), /The night timetable is a public document/);
  assert.match(JSON.stringify(doc.blocks), /Story year: 1978/);
  assert.match(JSON.stringify(doc.blocks), /If the sheet is public/);
  assert.match(JSON.stringify(doc.blocks), /Cars wait under the shed/);
  assert.equal(doc.blocks.some((block) => block.type === "image" && block.src === "/media/plate-yard.svg"), true);
});
