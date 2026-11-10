import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Twilda" }).waitFor();
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase("twilda-demo");
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
  await page.reload();
  await page.getByTestId("doc-franchise").waitFor();
  if (process.env.TWILDA_SHOTS) await page.screenshot({ path: `${process.env.TWILDA_SHOTS}/twilda-list.png` });
});

test("phone width can edit, reorder, upload, preview, publish, and roll back", async ({ page }) => {
  expect(page.viewportSize()?.width).toBe(390);
  await page.getByTestId("doc-franchise").click();
  await page.getByTestId("field-p-ledger-text").fill("EDITED LEDGER SENTENCE");
  if (process.env.TWILDA_SHOTS) await page.screenshot({ path: `${process.env.TWILDA_SHOTS}/twilda-editor.png` });
  const handle = page.getByTestId("handle-findings");
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  if (!box) throw new Error("missing drag handle");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 90, { steps: 8 });
  await page.mouse.up();
  await page.getByTestId("tab-media").click();
  await page.getByTestId("upload").setInputFiles({
    name: "dot.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
  });
  await expect(page.getByTestId("status")).toContainText("Image stored");
  await page.getByTestId("tab-preview").click();
  await page.getByTestId("preview-draft").click();
  const frame = page.frameLocator("[data-testid=preview-frame]");
  await expect(frame.getByText("EDITED LEDGER SENTENCE")).toBeVisible();
  if (process.env.TWILDA_SHOTS) await page.screenshot({ path: `${process.env.TWILDA_SHOTS}/twilda-preview.png` });
  const draftText = await frame.locator("body").innerText();
  expect(draftText.indexOf("One ledger")).toBeLessThan(draftText.indexOf("Published figures"));
  await expect(frame.getByText("Published figures")).toBeVisible();
  await page.getByTestId("preview-published").click();
  await expect(frame.getByText("EDITED LEDGER SENTENCE")).toHaveCount(0);
  await page.getByTestId("tab-publish").click();
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("status")).toContainText("demo://pull/");
  if (process.env.TWILDA_SHOTS) await page.screenshot({ path: `${process.env.TWILDA_SHOTS}/twilda-publish.png` });
  await page.getByTestId("tab-preview").click();
  await page.getByTestId("preview-published").click();
  await expect(frame.getByText("EDITED LEDGER SENTENCE")).toBeVisible();
  await page.getByTestId("tab-publish").click();
  await page.getByTestId("rollback-button").click();
  await expect(page.getByTestId("status")).toContainText("Rolled back");
  await page.getByTestId("tab-preview").click();
  await page.getByTestId("preview-published").click();
  await expect(frame.getByText("EDITED LEDGER SENTENCE")).toHaveCount(0);
});

test("a blank title shows a save error", async ({ page }) => {
  await page.getByTestId("doc-franchise").click();
  await page.getByTestId("field-title").fill("");
  await page.getByTestId("save-draft").click();
  await expect(page.getByTestId("error")).toBeVisible();
});

test("the list fits a 390px screen", async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
