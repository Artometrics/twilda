import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitWithin, safeName } from "./downscale";

describe("fitWithin", () => {
  it("leaves an image that already fits", () => {
    assert.deepEqual(fitWithin(800, 600, 1600), { width: 800, height: 600, scaled: false });
  });

  it("scales the long edge down to the limit", () => {
    assert.deepEqual(fitWithin(3200, 1600, 1600), { width: 1600, height: 800, scaled: true });
    assert.deepEqual(fitWithin(1000, 4000, 1600), { width: 400, height: 1600, scaled: true });
  });

  it("rejects empty dimensions", () => {
    assert.throws(() => fitWithin(0, 400, 1600), /positive/);
    assert.throws(() => fitWithin(400, -1, 1600), /positive/);
  });
});

describe("safeName", () => {
  it("keeps a file name that can live in a path", () => {
    assert.equal(safeName("Yard Night.PNG"), "yard-night.png");
    assert.equal(safeName("   "), "image");
  });
});
