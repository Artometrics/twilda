import dodgers from "../../../../drafts/artometrics/dodgers-four-million-fans.json";
import dwts from "../../../../drafts/artometrics/data-with-the-stars.json";
import franchise from "../../../../drafts/artometrics/franchise-toy-aisle.json";
import { normalizeDoc } from "../doc";
import type { Doc } from "../model";
import type { StorageBackend } from "../contract";
import { draftPath } from "./paths";

/**
 * Three real-fact drafts for the Artometrics desk. Source files live in
 * `drafts/artometrics/` so they can be reviewed and edited as plain JSON.
 */
export const ARTOMETRICS_DRAFTS: Doc[] = [franchise, dodgers, dwts].map((raw) => normalizeDoc(raw));

export const SEEDED_MARKER = "meta/seeded-artometrics-v1";

export async function seedArtometrics(backend: StorageBackend, overwrite = false): Promise<number> {
  let written = 0;
  for (const doc of ARTOMETRICS_DRAFTS) {
    if (!overwrite) {
      const exists = await backend.read(draftPath(doc.id)).then(
        () => true,
        () => false,
      );
      if (exists) continue;
    }
    await backend.write(draftPath(doc.id), `${JSON.stringify(doc, null, 2)}\n`);
    written += 1;
  }
  return written;
}

/** First visit only: write the sample drafts once. Deleting one later does not bring it back. */
export async function seedOnFirstVisit(backend: StorageBackend): Promise<void> {
  const seeded = await backend.read(SEEDED_MARKER).then(
    () => true,
    () => false,
  );
  if (seeded) return;
  await seedArtometrics(backend);
  await backend.write(SEEDED_MARKER, new Date().toISOString());
}
