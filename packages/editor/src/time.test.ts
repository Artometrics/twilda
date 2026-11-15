import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEdited } from "./time";

const now = new Date("2026-11-15T12:00:00.000Z");

describe("formatEdited", () => {
  it("says just now inside a minute", () => {
    assert.equal(formatEdited("2026-11-15T11:59:30.000Z", now), "Just now");
  });
  it("counts minutes, hours, and days", () => {
    assert.equal(formatEdited("2026-11-15T11:48:00.000Z", now), "12 minutes ago");
    assert.equal(formatEdited("2026-11-15T09:00:00.000Z", now), "3 hours ago");
    assert.equal(formatEdited("2026-11-14T10:00:00.000Z", now), "yesterday");
    assert.equal(formatEdited("2026-11-12T12:00:00.000Z", now), "3 days ago");
  });
  it("falls back to a date after a week", () => {
    assert.equal(formatEdited("2026-10-01T12:00:00.000Z", now), "Oct 1");
    assert.match(formatEdited("2025-10-01T12:00:00.000Z", now), /2025/);
  });
  it("does not throw on a bad date", () => {
    assert.equal(formatEdited("nope", now), "Never edited");
  });
});
