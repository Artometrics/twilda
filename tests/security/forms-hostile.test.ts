import assert from "node:assert/strict";
import test from "node:test";
import {
  FORM_FIELD_MAX,
  FORM_MAX_PAYLOAD_CHARS,
  checkFormEndpoint,
  createFormSection,
  documentSchema,
  formFieldNames,
  isSafeEmail,
  parseSite,
  renderDocument,
  serializeSite,
  siteCsp,
  starterSite,
  validateSubmission,
  type FormsConfig,
  type PageDocument,
} from "@twilda/core";
import { XSS_PAYLOADS, assertInertMarkup, stringLeaves, withLeaf } from "./support";

const LIVE: FormsConfig = { endpoint: "https://formspree.io/f/xyzabcde", mode: "fetch", format: "form", hidden: {} };

function page(): PageDocument {
  const section = createFormSection("enquiry", "lead");
  return documentSchema.parse({
    id: "home",
    kind: "page",
    title: "Home",
    slug: "home",
    dek: "",
    kicker: "",
    status: "published",
    updatedAt: "2026-11-15T00:00:00.000Z",
    sections: [{ ...section, fields: [...section.fields, { id: "ok", kind: "consent", label: "I agree", required: true, hint: "A hint" }, { id: "msg", kind: "message", label: "Message", required: false, hint: "" }] }],
  }) as PageDocument;
}

const BAD_ENDPOINTS: Array<[string, string]> = [
  ["a javascript: URL", "javascript:alert(1)"],
  ["a data: URL", "data:text/html,<script>alert(1)</script>"],
  ["plain http", "http://forms.example-studio.com/f"],
  ["protocol-relative", "//forms.example-studio.com/f"],
  ["no scheme", "forms.example-studio.com/f"],
  ["ftp", "ftp://forms.example-studio.com/f"],
  ["a wildcard host", "https://*.example-studio.com/f"],
  ["a wildcard path", "https://forms.example-studio.com/*"],
  ["a second directive smuggled after ;", "https://forms.example-studio.com;script-src *"],
  ["a second source smuggled after a space", "https://forms.example-studio.com https://evil.example"],
  ["a second source smuggled after a comma", "https://forms.example-studio.com,https://evil.example"],
  ["a quote", "https://forms.example-studio.com/f'"],
  ["credentials", "https://user:pass@forms.example-studio.com/f"],
  ["the user@host trick", "https://forms.example-studio.com@evil.example/f"],
  ["a backslash host trick", "https://forms.example-studio.com\\@evil.example/f"],
  ["an IPv4 address", "https://203.0.113.9/f"],
  ["loopback", "https://127.0.0.1/f"],
  ["an IPv6 address", "https://[::1]/f"],
  ["localhost", "https://localhost/f"],
  ["a dotless host", "https://intranet/f"],
  ["a .local host", "https://printer.local/f"],
  ["a punycode host", "https://xn--pple-43d.example/f"],
  ["a look-alike (Cyrillic) host", "https://аpple.example-studio.com/f"],
  ["a trailing dot", "https://forms.example-studio.com./f"],
  ["a fragment", "https://forms.example-studio.com/f#x"],
  ["a raw newline", "https://forms.example-studio.com/f\nSet-Cookie: a=b"],
  ["an encoded newline", "https://forms.example-studio.com/f%0d%0aSet-Cookie:a=b"],
  ["a space", "https://forms.example-studio.com/a b"],
  ["a tab", "https://forms.example-studio.com/a\tb"],
  ["a zero-width character", "https://forms.example-studio.com/\u200bf"],
  ["an empty value", ""],
  ["a very long value", `https://forms.example-studio.com/${"a".repeat(300)}`],
  ["an angle bracket", "https://forms.example-studio.com/<x>"],
];

for (const [label, endpoint] of BAD_ENDPOINTS) {
  test(`endpoint: refuses ${label}`, () => {
    assert.equal(checkFormEndpoint(endpoint).ok, false, endpoint);
    assert.throws(() => parseSite(serializeSiteWith(endpoint)), /invalid-site|form|address|https|host|ip|character/i);
    assert.throws(() => siteCsp({ forms: { endpoint } }), /not a valid/);
    // The renderer is a second gate: even if a bad address reached it, the form prints inert.
    const html = renderDocument(page(), { forms: { ...LIVE, endpoint } });
    assert.doesNotMatch(html, /\saction=|<script|data-tf(?!-kind)/);
    assertInertMarkup(html, label);
  });
}

function serializeSiteWith(endpoint: string): string {
  const base = JSON.parse(serializeSite(starterSite("magazine"))) as Record<string, unknown>;
  return JSON.stringify({ ...base, forms: { endpoint } });
}

test("every accepted endpoint yields a policy with one concrete origin and no wildcard", () => {
  for (const endpoint of ["https://formspree.io/f/a", "https://hook.eu1.make.com/x", "https://a-b.example-studio.com:8443/f?k=v"]) {
    const csp = siteCsp({ forms: { endpoint } });
    const origin = new URL(endpoint).origin;
    assert.match(csp, new RegExp(`form-action ${origin.replace(/[.]/g, "\\.")}; `));
    assert.equal(csp.split(origin).length - 1, 2, "form-action and connect-src, nowhere else");
    assert.doesNotMatch(csp, /\*|unsafe-|(?:^|[ ;])https?:(?:[ ;]|$)|data:|blob:/);
  }
});

test("every string a form shows survives every XSS payload, live or inert, annotated or not", () => {
  const doc = page();
  const leaves = stringLeaves(doc).filter((leaf) => {
    const key = String(leaf.path[leaf.path.length - 1]);
    return !["kind", "type", "variant", "status", "updatedAt", "required", "id", "slug"].includes(key);
  });
  assert.ok(leaves.length >= 20, `exercised ${leaves.length} fields`);
  for (const leaf of leaves) {
    for (const payload of XSS_PAYLOADS) {
      const hostile = withLeaf(doc, leaf.path, payload);
      for (const options of [{ forms: LIVE }, { forms: LIVE, preview: true, annotate: true }, {}]) {
        const live = "forms" in options && !("preview" in options);
        assertInertMarkup(renderDocument(hostile, options), `${leaf.path.join(".")} payload=${JSON.stringify(payload).slice(0, 30)}`, { forms: live });
      }
    }
  }
});

test("field ids that look like markup or like another field cannot reach a name or break an attribute", () => {
  const doc = page();
  for (const id of ['x" onfocus="alert(1)', "a b", "<img>", "../x", "a\nb"]) {
    const hostile = structuredClone(doc);
    const section = hostile.sections[0];
    if (section?.type !== "form") throw new Error("form expected");
    section.fields[0] = { ...section.fields[0]!, id };
    assert.equal(documentSchema.safeParse(hostile).success, false, `id ${JSON.stringify(id)} must not pass the schema`);
    assertInertMarkup(renderDocument(hostile, { forms: LIVE }), `bypassed id ${JSON.stringify(id)}`, { forms: true });
  }
});

test("hidden fields from the site cannot carry markup or reuse the page's own names", () => {
  const hostile: FormsConfig = { ...LIVE, hidden: { "form-name": `"><script>alert(1)</script>`, _subject: `x" onmouseover="alert(1)` } };
  const html = renderDocument(page(), { forms: hostile });
  assertInertMarkup(html, "hidden values", { forms: true });
  assert.doesNotMatch(html, /<script>alert/);
});

const section = createFormSection("enquiry", "contact");
const good = { name: "Ada", email: "ada@example.com", message: "Hi" };

test("submission: an oversized field, an oversized whole, and a non-string are refused", () => {
  assert.equal(validateSubmission(section, { ...good, message: "x".repeat(FORM_FIELD_MAX.message + 1) }).ok, false);
  assert.equal(validateSubmission(section, { ...good, name: "n".repeat(FORM_FIELD_MAX.name + 1) }).ok, false);
  const long = createFormSection("many", "contact");
  const fields = Array.from({ length: 4 }, (_, index) => ({ id: `m${index}`, kind: "message" as const, label: "M", required: false, hint: "" }));
  const many = { ...long, fields: [...long.fields.slice(0, 2), ...fields] };
  const names = formFieldNames(many.fields);
  const values: Record<string, string> = { name: "A", email: "a@example.com" };
  for (const name of names.filter((n) => n.startsWith("message"))) values[name] = "y".repeat(FORM_FIELD_MAX.message);
  assert.ok(Object.values(values).join("").length > FORM_MAX_PAYLOAD_CHARS);
  assert.equal(validateSubmission(many, values).ok, false, "the total is capped even when each field is within its own limit");
  for (const value of [["a@example.com"], { toString: "x" }, 42, null, true]) {
    assert.equal(validateSubmission(section, { ...good, email: value }).ok, false, JSON.stringify(value));
  }
});

test("submission: header injection through an email address is refused in every shape", () => {
  const attacks = [
    "ada@example.com\nBcc: victim@example.com",
    "ada@example.com\r\nBcc: victim@example.com",
    "ada@example.com%0aBcc:victim@example.com",
    "ada@example.com%0D%0ASubject:x",
    "ada@example.com\u2028Bcc: x@y.com",
    "ada@example.com\u0085Bcc: x@y.com",
    "ada@example.com,victim@example.com",
    "ada@example.com;victim@example.com",
    "ada@example.com victim@example.com",
    "Ada <ada@example.com>",
    '"ada@example.com"',
    "ada@example.com>\r\nTo: x@y.com",
    "ada(comment)@example.com",
    "ada@[203.0.113.9]",
    "ada@xn--pple-43d.com",
    "a\u0000b@example.com",
    "ada@example.com\u200b",
    "ada@examp\u0435le.com",
    `${"a".repeat(250)}@example.com`,
  ];
  for (const email of attacks) {
    assert.equal(isSafeEmail(email), false, JSON.stringify(email));
    assert.equal(validateSubmission(section, { ...good, email }).ok, false, JSON.stringify(email));
  }
  for (const email of ["ada@example.com", "ada.l+news@mail.example.co.uk", "a_b-c@example-studio.com"]) assert.equal(isSafeEmail(email), true, email);
});

test("submission: a one-line field refuses a line break, so it cannot add a header or a spreadsheet row", () => {
  for (const name of ["Ada\nX-Injected: 1", "Ada\r\nBcc: x@y.com", "Ada%0aBcc: x", "Ada\u2028x", "bell\u0007"]) {
    assert.equal(validateSubmission(section, { ...good, name }).ok, false, JSON.stringify(name));
  }
});

test("submission: spam signals are reported, and prototype keys are ignored", () => {
  const result = validateSubmission(section, { ...good, _hp: "x", __proto__: { polluted: true }, constructor: "c", toString: "t" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.spam, true);
    assert.deepEqual(Object.keys(result.values).sort(), ["email", "message", "name"]);
  }
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});
