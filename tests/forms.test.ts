import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import vm from "node:vm";
import {
  FORMS_CLIENT_JS,
  FORM_FIELD_KINDS,
  FORM_FIELD_MAX,
  FORM_MIN_FILL_MS,
  FORM_VARIANTS,
  PART_FIELDS,
  checkFormEndpoint,
  createFormSection,
  createSection,
  defaultFields,
  documentSchema,
  formFieldNames,
  parseSite,
  renderDocument,
  renderOptionsFor,
  serializeSite,
  siteCsp,
  starterDocuments,
  starterSite,
  usesForms,
  validateSubmission,
  type FormFieldKind,
  type FormsConfig,
  type PageDocument,
  type TwildaDocument,
} from "@twilda/core";
import { checkForms } from "../scripts/lib/forms-check";
import { headersFor, hostingTarget, parsePolicy, policyProblems } from "./support/csp";
import { assertInertMarkup } from "./security/support";

const ENDPOINT = "https://formspree.io/f/xyzabcde";
const LIVE: FormsConfig = { endpoint: ENDPOINT, mode: "fetch", format: "form", hidden: {} };

function pageWith(...sections: unknown[]): PageDocument {
  return documentSchema.parse(rawPage(...sections)) as PageDocument;
}

function rawPage(...sections: unknown[]) {
  return {
    id: "home",
    kind: "page",
    title: "Home",
    slug: "home",
    dek: "",
    kicker: "",
    status: "published",
    updatedAt: "2026-11-15T00:00:00.000Z",
    sections,
  };
}

const form = (variant: "contact" | "lead" | "newsletter" = "contact", id = "enquiry") => createFormSection(id, variant);

describe("the form section", () => {
  for (const variant of FORM_VARIANTS) {
    it(`${variant}: its default field set is valid, and every field kind has a limit`, () => {
      const section = form(variant);
      assert.equal(documentSchema.safeParse(pageWith(section)).success, true);
      assert.deepEqual(section.fields, defaultFields(variant));
      for (const kind of FORM_FIELD_KINDS) assert.ok(FORM_FIELD_MAX[kind] > 0);
    });
  }

  it("is in the library, the labels, and the desk's field list", () => {
    assert.equal(createSection("form").type, "form");
    const spec = PART_FIELDS.sections.form;
    assert.ok(spec);
    assert.deepEqual(spec?.fields.find((field) => field.key === "variant")?.options?.map((option) => option.value), [...FORM_VARIANTS]);
    assert.deepEqual(spec?.lists[0]?.fields?.find((field) => field.key === "kind")?.options?.map((option) => option.value), [...FORM_FIELD_KINDS]);
  });

  it("refuses a form nobody could answer, a repeated field id, an unknown kind or variant, and too many fields", () => {
    const base = form("contact");
    const bad = (change: (section: typeof base) => unknown) => documentSchema.safeParse(rawPage(change(structuredClone(base)))).success;
    assert.equal(bad((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f, required: f.kind === "message" })) })), false, "no required email or phone");
    assert.equal(bad((s) => ({ ...s, fields: [s.fields[0], s.fields[0], s.fields[1]] })), false, "duplicate field id");
    assert.equal(bad((s) => ({ ...s, fields: [...s.fields, { id: "x", kind: "password", label: "x", required: false, hint: "" }] })), false, "unknown kind");
    assert.equal(bad((s) => ({ ...s, variant: "survey" })), false, "unknown variant");
    assert.equal(bad((s) => ({ ...s, fields: Array.from({ length: 9 }, (_, i) => ({ id: `f${i}`, kind: i === 0 ? "email" : "text", label: "q", required: i === 0, hint: "" })) })), false, "nine fields");
    assert.equal(bad((s) => ({ ...s, submitLabel: "" })), false, "empty button");
    assert.equal(bad((s) => ({ ...s, fields: [{ id: "e", kind: "phone", label: "Phone", required: true, hint: "" }] })), true, "phone alone is a way to reach someone");
    assert.equal(bad((s) => ({ ...s, action: "https://evil.example" })), true, "unknown keys are stripped, not honoured");
  });

  it("gives every field a stable submitted name: its kind, then _2, _3", () => {
    assert.deepEqual(formFieldNames([{ kind: "name" }, { kind: "email" }, { kind: "text" }, { kind: "text" }, { kind: "text" }]), ["name", "email", "text", "text_2", "text_3"]);
  });
});

describe("site.json forms setting", () => {
  const base = JSON.parse(serializeSite(starterSite("leadgen"))) as Record<string, unknown>;
  const withForms = (forms: unknown) => JSON.stringify({ ...base, forms });

  it("is optional, and a site without it is unchanged", () => {
    const magazine = starterSite("magazine");
    assert.equal(magazine.forms, undefined);
    assert.equal("forms" in JSON.parse(serializeSite(magazine)), false);
    assert.equal(renderOptionsFor(magazine, { id: "home", kind: "page" }).forms, undefined);
  });

  it("round-trips with its defaults filled in", () => {
    const site = parseSite(withForms({ endpoint: ENDPOINT }));
    assert.deepEqual(site.forms, { endpoint: ENDPOINT, mode: "fetch", format: "form", hidden: {} });
    assert.deepEqual(parseSite(serializeSite(site)), site);
    assert.deepEqual(renderOptionsFor(site, { id: "home", kind: "page" }).forms, site.forms);
  });

  it("keeps hidden fields short, few, and away from the page's own names", () => {
    assert.doesNotThrow(() => parseSite(withForms({ endpoint: ENDPOINT, hidden: { "form-name": "contact", _subject: "New lead" } })));
    for (const hidden of [{ _hp: "x" }, { _elapsed_ms: "1" }, { _page: "/" }, { _form: "x" }, { email: "x" }, { name_2: "x" }, { "bad name": "x" }, { x: "a\nb" }, { x: "y".repeat(121) }, { a: "1", b: "2", c: "3", d: "4", e: "5", f: "6" }]) {
      assert.throws(() => parseSite(withForms({ endpoint: ENDPOINT, hidden })), /invalid-site|hidden|name|break|at most|used/i, JSON.stringify(hidden));
    }
  });

  it("refuses unknown keys and a plain post that claims to send JSON", () => {
    assert.throws(() => parseSite(withForms({ endpoint: ENDPOINT, secret: "x" })));
    assert.throws(() => parseSite(withForms({ endpoint: ENDPOINT, mode: "post", format: "json" })));
    assert.doesNotThrow(() => parseSite(withForms({ endpoint: ENDPOINT, mode: "post" })));
  });
});

describe("the endpoint", () => {
  const recipes = [
    "https://formspree.io/f/xyzabcde",
    "https://usebasin.com/f/0a1b2c3d4e5f",
    "https://hooks.zapier.com/hooks/catch/123456/abcdef/",
    "https://hook.eu1.make.com/abcdefghijklmnop",
    "https://my-site.netlify.app/",
    "https://hooks.airtable.com/workflows/v1/genericWebhook/appXXXX/wflYYYY/wtrZZZZ",
    "https://leads.example-studio.com:8443/submit",
    "HTTPS://Forms.Example-Studio.com/Submit",
  ];
  for (const value of recipes) {
    it(`accepts ${value}`, () => {
      const result = checkFormEndpoint(value);
      assert.equal(result.ok, true, result.reason);
      assert.match(result.origin as string, /^https:\/\/[a-z0-9.-]+(?::\d+)?$/);
    });
  }

  it("builds the policy source from the parsed origin, lower case, never the raw text", () => {
    assert.equal(checkFormEndpoint("HTTPS://Forms.Example-Studio.com/Submit?x=1").origin, "https://forms.example-studio.com");
  });
});

describe("per-site Content-Security-Policy", () => {
  const locked = headersFor(hostingTarget("site")).get("Content-Security-Policy") as string;

  it("with no form it is exactly the policy in firebase.json", () => {
    assert.equal(siteCsp(), locked);
    assert.equal(siteCsp(null), locked);
    assert.equal(siteCsp({}), locked);
    assert.equal(siteCsp({ forms: null }), locked);
    assert.equal(siteCsp(starterSite("magazine")), locked);
    assert.deepEqual(policyProblems(parsePolicy(siteCsp()), { runsScript: false, images: "self", connect: ["'none'"], frames: ["https://www.youtube-nocookie.com", "https://player.vimeo.com"], workers: ["'none'"] }), []);
  });

  it("with a form it changes exactly three directives, each to the one origin or 'self'", () => {
    const csp = siteCsp({ forms: LIVE });
    const policy = parsePolicy(csp);
    assert.equal(csp, locked.replace("form-action 'none'", "form-action https://formspree.io").replace("script-src 'none'", "script-src 'self'").replace("connect-src 'none'", "connect-src https://formspree.io"));
    assert.deepEqual(
      policyProblems(policy, { runsScript: true, images: "self", connect: ["https://formspree.io"], formAction: ["https://formspree.io"], frames: ["https://www.youtube-nocookie.com", "https://player.vimeo.com"], workers: ["'none'"] }),
      [],
    );
    assert.doesNotMatch(csp, /\*|unsafe-|https:(?!\/\/)|http:/);
    assert.ok(policy.has("upgrade-insecure-requests"));
  });

  it("in post mode the script may run to check fields, but connect-src stays shut", () => {
    const policy = parsePolicy(siteCsp({ forms: { ...LIVE, mode: "post" } }));
    assert.deepEqual(policy.get("connect-src"), ["'none'"]);
    assert.deepEqual(policy.get("form-action"), ["https://formspree.io"]);
    assert.deepEqual(policy.get("script-src"), ["'self'"]);
  });

  it("throws rather than build a policy for an endpoint that is not valid", () => {
    for (const endpoint of ["http://x.com/f", "https://x.com;script-src *", "javascript:alert(1)", ""]) {
      assert.throws(() => siteCsp({ forms: { endpoint } }), /not a valid/);
    }
  });

  it("the starters' policies are built from their own settings", () => {
    for (const id of ["corporate", "leadgen"] as const) {
      const site = starterSite(id);
      assert.ok(site.forms);
      assert.match(siteCsp(site), /form-action https:\/\/forms\.example\.com;/);
    }
  });
});

describe("rendering a form", () => {
  const page = pageWith(form("contact"), { ...form("lead", "lead"), fields: [...defaultFields("lead"), { id: "extra", kind: "text", label: "Anything else?", required: false, hint: "Optional." }, { id: "ok", kind: "consent", label: "I agree to be contacted", required: true, hint: "" }] });
  const live = renderDocument(page, { forms: LIVE });

  it("is a post to the one address with the script, the honeypot, and the section id", () => {
    assert.equal((live.match(/<form\b/g) ?? []).length, 2);
    assert.equal((live.match(new RegExp(`action="${ENDPOINT}"`, "g")) ?? []).length, 2);
    assert.equal((live.match(/<script\b/g) ?? []).length, 2, "one tag per form; the browser loads the file once");
    assert.match(live, /<script src="\/twilda-forms\.js" defer><\/script>/);
    assert.match(live, /name="_hp" tabindex="-1" autocomplete="off" value=""/);
    assert.match(live, /<input type="hidden" name="_form" value="enquiry" \/>/);
    assert.equal(live.split(ENDPOINT).length - 1, 2, "the address appears only as an action");
    assertInertMarkup(live, "live forms", { forms: true });
  });

  it("prints inert with no address: no action, no script, disabled fields, and says so", () => {
    for (const html of [renderDocument(page), renderDocument(page, { forms: LIVE, preview: true }), renderDocument(page, { forms: LIVE, preview: true, annotate: true })]) {
      assert.doesNotMatch(html, /\saction=|<script|data-tf(?!-kind)/);
      assert.match(html, /<fieldset class="form-fields" disabled>/);
      assert.match(html, /class="form-note"/);
      assertInertMarkup(html, "inert form");
    }
    assert.match(renderDocument(page), /not connected yet/);
    assert.match(renderDocument(page, { forms: LIVE, preview: true }), /sends nothing here/);
  });

  it("an address that is not valid prints inert even if it reaches the renderer by another way", () => {
    const html = renderDocument(page, { forms: { ...LIVE, endpoint: "javascript:alert(1)" } });
    assert.doesNotMatch(html, /javascript|\saction=|<script/);
  });

  it("annotating adds only data-twilda attributes, and the form's labels are editable", () => {
    const annotated = renderDocument(page, { forms: LIVE, annotate: true, preview: true });
    const plain = renderDocument(page, { forms: LIVE, preview: true });
    assert.equal(annotated.replace(/ data-twilda-[a-z-]+="[^"]*"/g, ""), plain);
    assert.match(annotated, /data-twilda-ref="sections\.0\.fields\.1\.label"/);
    assert.match(annotated, /data-twilda-ref="sections\.0\.submitLabel"/);
    assert.match(annotated, /data-twilda-node="sections\.1" data-twilda-node-type="form"/);
  });

  it("is accessible: every label points at a control, every control is described by elements that exist, ids are unique", () => {
    const ids = [...live.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1] as string);
    assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), []);
    for (const match of live.matchAll(/<label class="form-label" for="([^"]+)"/g)) assert.ok(ids.includes(match[1] as string), `label for ${match[1]}`);
    for (const match of live.matchAll(/aria-describedby="([^"]+)"/g)) for (const target of (match[1] as string).split(" ")) assert.ok(ids.includes(target), `describedby ${target}`);
    assert.match(live, /type="email"[^>]*autocomplete="email"/);
    assert.match(live, /<textarea\b[^>]*maxlength="2000"/);
    assert.match(live, /type="checkbox"[^>]*value="yes"[^>]*required/);
    assert.match(live, /role="status" tabindex="-1" hidden/);
    assert.match(live, /role="alert" tabindex="-1" hidden/);
    for (const control of live.matchAll(/<(?:input|textarea)\b[^>]*>/g)) {
      if (/type="hidden"|name="_hp"/.test(control[0])) continue;
      assert.match(control[0], /\sname="[a-z_0-9]+"/);
      assert.match(control[0], /maxlength="\d+"|type="checkbox"/);
    }
  });

  it("repeats a field kind under a numbered name", () => {
    const html = renderDocument(page, { forms: LIVE });
    assert.match(html, /name="text" data-tf-kind="text"/);
    assert.match(html, /name="text_2" data-tf-kind="text"/);
  });

  it("carries the site's fixed hidden fields, escaped", () => {
    const html = renderDocument(page, { forms: { ...LIVE, hidden: { "form-name": 'a"b<c', _subject: "Hi & bye" } } });
    assert.match(html, /<input type="hidden" name="form-name" value="a&quot;b&lt;c" \/>/);
    assert.match(html, /<input type="hidden" name="_subject" value="Hi &amp; bye" \/>/);
  });

  it("carries no inline script, handler, or style, and the page itself needs no style attribute", () => {
    assert.doesNotMatch(live, /\son[a-z]+=|\sstyle=|<style|javascript:/i);
  });

  it("a page with no form section prints exactly what it printed before, whatever the site settings say", () => {
    const home = starterDocuments("magazine").find((doc) => doc.id === "home") as TwildaDocument;
    assert.equal(renderDocument(home, { forms: LIVE }), renderDocument(home));
    assert.equal(usesForms([home]), false);
    assert.equal(usesForms([page]), true);
  });
});

describe("checking a submission", () => {
  const section = form("contact");
  const good = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello\nthere" };

  it("accepts a good one and keeps only the section's fields, trimmed", () => {
    const result = validateSubmission(section, { ...good, name: "  Ada Lovelace ", extra: "x", __proto__: "y", constructor: "z" });
    assert.deepEqual(result, { ok: true, values: { ...good, name: "Ada Lovelace" }, spam: false });
  });

  it("reports a missing required field and a wrong email, by field name", () => {
    const result = validateSubmission(section, { name: "", email: "nope", message: "" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.deepEqual(Object.keys(result.errors).sort(), ["email", "message", "name"]);
  });

  it("flags the honeypot and a too-fast submit as spam without refusing the shape", () => {
    assert.equal((validateSubmission(section, { ...good, _hp: "http://spam" }) as { spam: boolean }).spam, true);
    assert.equal((validateSubmission(section, { ...good, _elapsed_ms: String(FORM_MIN_FILL_MS - 1) }) as { spam: boolean }).spam, true);
    assert.equal((validateSubmission(section, { ...good, _elapsed_ms: String(FORM_MIN_FILL_MS) }) as { spam: boolean }).spam, false);
    assert.equal((validateSubmission(section, { ...good, _elapsed_ms: "not a number" }) as { spam: boolean }).spam, false);
  });

  it("the page's script and the validator agree on a corpus (same rules, written twice)", () => {
    const sandbox: { window: Record<string, unknown> } = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(FORMS_CLIENT_JS, sandbox);
    const rules = sandbox.window.TwildaFormRules as { problem: (kind: string, required: boolean, value: string) => string | null; MIN_MS: number };
    assert.equal(rules.MIN_MS, FORM_MIN_FILL_MS);
    const values: Record<FormFieldKind, string[]> = {
      name: ["Ada", "", " ", "A".repeat(100), "A".repeat(101), "Ada\nBcc: x@y.com", "Ada%0d%0aBcc: x", "tab\there"],
      email: ["ada@example.com", "a+b@sub.example.co.uk", "ada@example", "ada@", "@example.com", "a b@example.com", "ada@example.com\nBcc: x@y.com", "ada@example.com,x@y.com", "ada@example.com;x@y.com", "<ada@example.com>", '"ada"@example.com', "ada@exa%0ample.com", "ada%0a@example.com", "ada@xn--pple-43d.com", `${"a".repeat(65)}@example.com`, "ada@example.com ", "ада@example.com"],
      phone: ["+1 (555) 123-4567", "555.123.4567", "12345", "abcdef", "+44 20 7946 0958", "555-123-4567; DROP", "1".repeat(31)],
      company: ["Acme", "Acme\r\nX: y", "A".repeat(101)],
      message: ["Hello", "line one\nline two", "line\r\nline", "x".repeat(2000), "x".repeat(2001), "bell\u0007", "nul\u0000"],
      text: ["fine", "has\nbreak", "z".repeat(201), "\u2028x"],
      consent: ["yes", "", "no", "true", "YES"],
    };
    let compared = 0;
    for (const kind of FORM_FIELD_KINDS) {
      for (const value of values[kind]) {
        for (const required of [true, false]) {
          const fromScript = rules.problem(kind, required, value) === null;
          const fields = [{ kind: "email" as const, required: true }, { kind, required }];
          const named = formFieldNames(fields);
          const result = validateSubmission({ fields }, { email: "ada@example.com", [named[1] as string]: value });
          // For the second `email` the name is email_2; the first field is only there to satisfy the signature.
          assert.equal(result.ok, fromScript, `${kind} ${JSON.stringify(value)} required=${required}: script says ${fromScript ? "ok" : "problem"}, validator says ${result.ok ? "ok" : "problem"}`);
          compared += 1;
        }
      }
    }
    assert.ok(compared > 100);
  });

  it("the script is plain, external-safe text: no template, no eval, no network call of its own", () => {
    assert.doesNotMatch(FORMS_CLIENT_JS, /\beval\s*\(|new Function|document\.write|innerHTML|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|\bimport\s*\(|WebSocket|sendBeacon/);
    assert.equal((FORMS_CLIENT_JS.match(/\bfetch\(/g) ?? []).length, 1, "one fetch, to the form's own action");
    assert.match(FORMS_CLIENT_JS, /fetch\(form\.action, request\)/);
    assert.match(FORMS_CLIENT_JS, /credentials: "omit"/);
    assert.match(FORMS_CLIENT_JS, /referrerPolicy: "no-referrer"/);
    assert.doesNotMatch(FORMS_CLIENT_JS, /https?:\/\//, "no address is written into the script");
  });
});

describe("check:forms", () => {
  function site(forms: unknown, sections: unknown[]): string {
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "twilda-forms-"));
    const home = pageWith(...sections);
    fs.mkdirSync(path.join(dir, "home"), { recursive: true });
    fs.writeFileSync(path.join(dir, "home", "published.json"), `${JSON.stringify(home, null, 2)}\n`);
    const base = JSON.parse(serializeSite(starterSite("magazine"))) as Record<string, unknown>;
    fs.writeFileSync(path.join(dir, "site.json"), `${JSON.stringify(forms === undefined ? base : { ...base, forms }, null, 2)}\n`);
    return dir;
  }
  const hero = createSection("hero", "hero");

  it("a site with no form passes, with the locked policy", () => {
    const report = checkForms(site(undefined, [hero]));
    assert.deepEqual([report.errors, report.warnings], [[], []]);
    assert.equal(report.csp, siteCsp());
  });

  it("a published form with no form address is an error", () => {
    assert.match(checkForms(site(undefined, [hero, form()])).errors.join("\n"), /needs "forms"/);
  });

  it("a form address with no form warns that the policy is opened for nothing, and never opens it", () => {
    const report = checkForms(site({ endpoint: ENDPOINT, mode: "fetch", format: "form", hidden: {} }, [hero]));
    assert.match(report.warnings.join("\n"), /no published page has a form/);
    assert.equal(report.csp, siteCsp(), "an unused address does not widen the policy");
  });

  it("the starter's placeholder address warns until replaced", () => {
    const placeholder = starterSite("leadgen").forms;
    assert.match(checkForms(site(placeholder, [hero, form()])).warnings.join("\n"), /placeholder/);
    assert.deepEqual(checkForms(site({ endpoint: ENDPOINT, mode: "fetch", format: "form", hidden: {} }, [hero, form()])).warnings, []);
  });

  it("the repository's own content has no form and its policy is the locked one", () => {
    const report = checkForms(path.resolve("content"));
    assert.deepEqual([report.errors, report.formSections], [[], []]);
    assert.equal(report.csp, siteCsp());
  });

  it("each starter with a form passes (with the placeholder warning) and prints its policy", () => {
    for (const id of ["corporate", "leadgen"] as const) {
      const report = checkForms(path.resolve("examples", `starter-${id}`, "content"));
      assert.deepEqual(report.errors, []);
      assert.equal(report.formSections.length, 1);
      assert.match(report.csp as string, /form-action https:\/\/forms\.example\.com/);
    }
    assert.deepEqual(checkForms(path.resolve("examples", "starter-magazine", "content")).warnings, []);
  });
});
