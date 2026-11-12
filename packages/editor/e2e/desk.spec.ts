import { expect, test, type Page } from "@playwright/test";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function orderOf(page: Page) {
  return (await page.getByTestId("reorder-list").getAttribute("data-order")) ?? "";
}

test("field desk sample: edit, reorder, section, upload, preview, and publish", async ({ page }, info) => {
  const name = info.project.name;
  await page.goto("/?sample=field-desk");
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  await expect(page.getByTestId("doc-lumen-rail")).toContainText("Unpublished changes");
  await expect(page.getByTestId("doc-lumen-rail")).toContainText("Published");
  await expect(page.getByTestId("doc-river-note")).toContainText("Not published");

  await page.getByTestId("doc-lumen-rail").click();
  await expect(page.getByTestId("text-p-concession")).toBeVisible();
  await page.getByTestId("text-p-concession").fill("The night sheet moved. The yard copied it before the last train.");
  await page.getByTestId("down-p-concession").click();
  expect(await orderOf(page)).toMatch(/^h-concession h-yard p-concession/);

  const handle = page.getByTestId("handle-p-concession");
  const yard = page.locator("[data-id='h-yard']");
  await yard.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await handle.dragTo(yard, { targetPosition: { x: 24, y: 24 } });
  expect(await orderOf(page)).toMatch(/^h-concession p-concession h-yard/);
  await page.evaluate(() => {
    document.querySelector(".workspace")?.scrollTo(0, 0);
    document.querySelector(".pane-edit")?.scrollTo(0, 0);
  });

  await page.getByTestId("tab-media").click();
  await page.getByTestId("media-input").setInputFiles({
    name: "yard-night.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByTestId("media-library")).toContainText("yard-night.png");
  await expect(page.getByTestId("notice")).toContainText("Stored yard-night.png");

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("save-draft").click();
  await expect(page.getByTestId("notice")).toContainText("Draft saved");
  await expect(page.getByTestId("mast-status")).toHaveText("Unpublished changes");

  await page.getByTestId("tab-preview").click();
  await expect(page.getByTestId("preview-fallback")).toContainText("The night sheet moved.");
  await expect(page.getByTestId("preview-iframe")).toBeVisible();

  await page.getByTestId("tab-list").click();
  await page.getByTestId("doc-home").click();
  await page.getByTestId("add-section").click();
  await page.getByTestId("choose-category-tiles").click();
  await expect(page.getByTestId("reorder-list")).toHaveAttribute("data-order", /category-tiles-/);
  await expect(page.locator(".item").last().getByLabel("Label")).toHaveValue("Sections");

  await page.getByTestId("save-draft").click();
  await expect(page.getByTestId("notice")).toContainText("Draft saved");
  await page.getByTestId("publish").click();
  await expect(page.getByTestId("confirm-dialog")).toContainText("published file");
  await page.getByTestId("confirm-publish").click();
  await expect(page.getByTestId("notice")).toContainText("Published");
  await expect(page.getByTestId("mast-status")).toHaveText("Matches published");

  if (name === "iphone") {
    await page.evaluate(() => window.__TWILDA__?.plantBuildFault("home", "The static build exited with status 1."));
    await page.getByTestId("publish").click();
    await page.getByTestId("confirm-publish").click();
    await expect(page.getByTestId("error-banner")).toHaveAttribute("data-phase", "build");
    await expect(page.getByTestId("error-banner")).toContainText("Build failed");
    await expect(page.getByTestId("error-banner")).toContainText("status 1");
  }
});
