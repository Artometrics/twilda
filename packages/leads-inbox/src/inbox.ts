import { safeEqual, verifyRecord } from "./sign";
import type { InboxConfig, StoredLead } from "./types";

export const INBOX_CSP = "default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; img-src 'none'; connect-src 'none'; script-src 'none'";

const BASE = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": INBOX_CSP,
  "x-robots-tag": "noindex, nofollow",
} as const;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
}

/**
 * A cell that a spreadsheet will not run. A leading `=`, `+`, `-`, `@`, tab or carriage return makes Excel,
 * Sheets and Numbers read the cell as a formula, so those get a leading apostrophe.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: readonly StoredLead[], verified: ReadonlyMap<string, boolean>): string {
  const names = Array.from(new Set(rows.flatMap((row) => Object.keys(row.fields)))).sort();
  const head = ["received_at", "form", "page", "signature", ...names];
  const lines = [head.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [new Date(row.receivedAt).toISOString(), row.form, row.page ?? "", verified.get(row.id) ? "ok" : "BAD", ...names.map((name) => row.fields[name] ?? "")]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

const CSS = `:root{color-scheme:light dark}body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:1rem;max-width:60rem;margin-inline:auto}
h1{font-size:1.4rem}.meta{color:#666}ul{list-style:none;padding:0;display:grid;gap:.75rem}li{border:1px solid #8886;border-radius:8px;padding:.75rem 1rem;overflow-wrap:anywhere}
dl{margin:.5rem 0 0;display:grid;grid-template-columns:max-content 1fr;gap:.25rem .75rem}dt{font-weight:600}dd{margin:0;white-space:pre-wrap}
.bad{border-color:#c00;background:#c001}.tag{font-size:.8rem;border:1px solid currentColor;border-radius:4px;padding:0 .35rem}a{min-height:44px;display:inline-block}`;

export function renderInbox(rows: readonly StoredLead[], verified: ReadonlyMap<string, boolean>): string {
  const items = rows
    .map((row) => {
      const ok = verified.get(row.id) === true;
      const fields = Object.keys(row.fields)
        .sort()
        .map((name) => `<dt>${escapeHtml(name)}</dt><dd>${escapeHtml(row.fields[name] ?? "")}</dd>`)
        .join("");
      return `<li class="${ok ? "lead" : "lead bad"}"><strong>${escapeHtml(new Date(row.receivedAt).toISOString())}</strong> <span class="tag">${escapeHtml(row.form)}</span> <span class="tag">${
        ok ? "signature ok" : "SIGNATURE DOES NOT MATCH"
      }</span><dl>${fields}</dl></li>`;
    })
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Leads</title><link rel="stylesheet" href="/inbox.css"></head><body><h1>Leads</h1><p class="meta">${rows.length} newest, read only. <a href="/inbox.csv">Download CSV</a></p>${
    rows.length === 0 ? "<p>Nothing yet.</p>" : `<ul>${items}</ul>`
  }</body></html>`;
}

function basicOk(header: string | null, user: string, password: string): boolean {
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (char) => char.charCodeAt(0)));
  } catch {
    return false;
  }
  const at = decoded.indexOf(":");
  if (at < 0) return false;
  // Both comparisons always run so a wrong user name and a wrong password take the same time.
  const userOk = safeEqual(decoded.slice(0, at), user);
  const passOk = safeEqual(decoded.slice(at + 1), password);
  return userOk && passOk;
}

/** The read-only inbox: `GET /inbox` (HTML), `GET /inbox.csv`, `GET /inbox.css`. It has no form and no script, and it never writes. */
export function createInbox(config: InboxConfig): (request: Request) => Promise<Response> {
  if (config.password.length < 16) throw new Error("password must be at least 16 characters");
  if (config.signingSecret.length < 32) throw new Error("signingSecret must be at least 32 characters");
  const limit = Math.min(Math.max(config.limit ?? 200, 1), 1000);
  return async (request) => {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { ...BASE, allow: "GET, HEAD" } });
    const path = new URL(request.url).pathname;
    if (path === "/inbox.css") return new Response(CSS, { headers: { ...BASE, "content-type": "text/css; charset=utf-8" } });
    if (path !== "/inbox" && path !== "/inbox.csv") return new Response("Not found", { status: 404, headers: BASE });
    if (!basicOk(request.headers.get("authorization"), config.user, config.password)) {
      return new Response("Sign in required", { status: 401, headers: { ...BASE, "www-authenticate": 'Basic realm="Leads", charset="UTF-8"' } });
    }
    const rows = await config.store.list(limit);
    const verified = new Map<string, boolean>();
    for (const row of rows) verified.set(row.id, await verifyRecord(config.signingSecret, row, row.sig));
    if (path === "/inbox.csv") {
      return new Response(toCsv(rows, verified), {
        headers: { ...BASE, "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="leads.csv"' },
      });
    }
    return new Response(renderInbox(rows, verified), { headers: { ...BASE, "content-type": "text/html; charset=utf-8" } });
  };
}
