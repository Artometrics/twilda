import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { ZodError } from "zod";
import {
  ContentError,
  listSummaries,
  publishDocument,
  readDraft,
  readPublished,
  revertDraft,
  saveDraft,
} from "../src/content/store";
import { documentSchema, type ContentDocument } from "../src/schema/sections";

function parseIncoming(raw: unknown, id: string): ContentDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ContentError("Body must be a document object.");
  }
  return documentSchema.parse({
    ...raw,
    id,
    updatedAt: new Date().toISOString(),
  });
}

const MAX_BODY = 1_000_000;

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY) throw new ContentError("Request body is too large.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function fail(res: ServerResponse, error: unknown): void {
  if (error instanceof ContentError || error instanceof ZodError) {
    const message =
      error instanceof ZodError
        ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
        : error.message;
    send(res, 400, { error: message });
    return;
  }
  const message = error instanceof Error ? error.message : "Editor API failed.";
  send(res, 500, { error: message });
}

export function twildaApi(): Plugin {
  return {
    name: "twilda-content-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next).catch((error: unknown) => fail(res, error));
      });
    },
  };
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "documents") {
    next();
    return;
  }

  try {
    if (parts.length === 2 && req.method === "GET") {
      send(res, 200, { documents: listSummaries() });
      return;
    }

    const id = parts[2];
    if (!id) {
      send(res, 404, { error: "Missing document id." });
      return;
    }

    if (parts.length === 3 && req.method === "GET") {
      send(res, 200, { draft: readDraft(id), published: readPublished(id) });
      return;
    }

    if (parts.length === 3 && req.method === "PUT") {
      const parsed = parseIncoming(JSON.parse(await readBody(req)) as unknown, id);
      send(res, 200, { draft: saveDraft(parsed) });
      return;
    }

    if (parts.length === 4 && parts[3] === "publish" && req.method === "POST") {
      const parsed = parseIncoming(JSON.parse(await readBody(req)) as unknown, id);
      send(res, 200, publishDocument(parsed));
      return;
    }

    if (parts.length === 4 && parts[3] === "revert" && req.method === "POST") {
      send(res, 200, revertDraft(id));
      return;
    }

    send(res, 404, { error: "Unknown editor route." });
  } catch (error) {
    if (error instanceof SyntaxError) {
      send(res, 400, { error: "Body must be JSON." });
      return;
    }
    fail(res, error);
  }
}
