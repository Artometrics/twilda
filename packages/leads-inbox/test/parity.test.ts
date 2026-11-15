import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FORM_FIELD_KINDS, FORM_FIELD_MAX, FORM_MAX_PAYLOAD_CHARS, FORM_MIN_FILL_MS, isSafeEmail as coreEmail, validateSubmission } from "@twilda/core";
import { FIELD_KINDS, FIELD_MAX, MAX_PAYLOAD_CHARS, isSafeEmail, validateLead } from "../src/index";

/** The receiver keeps its own copy of the rules so it deploys alone. These tests keep that copy honest. */
describe("receiver rules match @twilda/core", () => {
  it("has the same kinds, limits and payload cap", () => {
    assert.deepEqual([...FIELD_KINDS], [...FORM_FIELD_KINDS]);
    assert.deepEqual(FIELD_MAX, FORM_FIELD_MAX);
    assert.equal(MAX_PAYLOAD_CHARS, FORM_MAX_PAYLOAD_CHARS);
    assert.equal(FORM_MIN_FILL_MS, 1500);
  });

  const samples = [
    "ada@example.org", "a@b", "a@example.org\r\nBcc: x", "a@example.org,b@c.de", "x@xn--e1afmkfd.example", "a b@example.org", "<a@example.org>", "a@example.org%0d", "ünï@example.org",
    "a@example.org%0A", "a@e.co", "A.B+tag@Example.ORG", "a@-bad.example", "a@example..org", "", "a".repeat(250) + "@example.org", "a@example.org\u2028",
  ];
  it("agrees with core on every email sample", () => {
    for (const sample of samples) assert.equal(isSafeEmail(sample), coreEmail(sample), JSON.stringify(sample));
  });

  it("agrees with core on whole submissions", () => {
    const section = { fields: [{ kind: "name", required: true }, { kind: "email", required: true }, { kind: "phone", required: false }, { kind: "message", required: false }, { kind: "consent", required: false }] as const };
    const cases: Record<string, string>[] = [
      { name: "Ada", email: "ada@example.org" },
      { name: "Ada", email: "ada@example.org", phone: "+1 (555) 010-9999", message: "Hi\r\nthere", consent: "yes" },
      { name: "Ada\nB", email: "ada@example.org" },
      { name: "Ada", email: "bad" },
      { name: "Ada", email: "ada@example.org", phone: "12" },
      { name: "Ada", email: "ada@example.org", consent: "on" },
      { name: "Ada", email: "ada@example.org", message: "x".repeat(2001) },
      { name: "Ada", email: "ada@example.org", message: "bell\u0007" },
      { name: "Ada", email: "ada@example.org%0d%0a" },
    ];
    for (const values of cases) {
      const core = validateSubmission(section as never, values);
      const raw = new Map<string, unknown>(Object.entries({ ...values, _form: "enquiry" }));
      const mine = validateLead(raw, { minFillMs: FORM_MIN_FILL_MS });
      assert.equal(mine.ok, core.ok, JSON.stringify(values));
      if (mine.ok && core.ok) assert.deepEqual(mine.fields, core.values);
      if (!mine.ok && !core.ok) {
        const names = Object.keys(core.errors).filter((name) => !name.startsWith("_"));
        for (const name of names) assert.ok(name in mine.errors, `${name} ${JSON.stringify(values)}`);
      }
    }
  });
});
