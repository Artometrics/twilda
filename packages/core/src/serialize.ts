import { ZodError } from "zod";
import { TwildaError } from "./errors";
import { documentSchema, type TwildaDocument } from "./schema";

/** Contract v1: JSON object, two-space indent, trailing newline. Key order follows the parsed object. */

export function formatDocumentError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "document"}: ${issue.message}`)
    .join("; ");
}

export function parseDocument(text: string): TwildaDocument {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new TwildaError("Document is not valid JSON.", "invalid-json");
  }
  try {
    return documentSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new TwildaError(formatDocumentError(error), "invalid-document");
    }
    throw error;
  }
}

export function serializeDocument(doc: TwildaDocument): string {
  let parsed: TwildaDocument;
  try {
    parsed = documentSchema.parse(doc);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new TwildaError(formatDocumentError(error), "invalid-document");
    }
    throw error;
  }
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

/** Ignores status and updatedAt so a publish stamp is not an edit. */
export function contentDigest(doc: TwildaDocument): string {
  if (doc.kind === "article") {
    const { status: _status, updatedAt: _updatedAt, ...rest } = doc;
    return JSON.stringify(rest);
  }
  const { status: _status, updatedAt: _updatedAt, ...rest } = doc;
  return JSON.stringify(rest);
}
