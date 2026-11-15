import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { documentSchema } from "../../packages/core/src/schema";

/**
 * The pages and the desk run under a Content-Security-Policy with no unsafe-eval. Zod 4 compiles
 * parsers with `new Function` unless told not to, and even a probe that is caught is reported as a
 * violation. The core package turns that off before it makes any schema.
 */
test("zod is configured not to generate code, and schemas still parse", () => {
  assert.equal(z.core.globalConfig.jitless, true);
  assert.equal(documentSchema.safeParse({}).success, false);
});
