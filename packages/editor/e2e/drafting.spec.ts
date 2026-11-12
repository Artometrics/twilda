import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SHOTS = resolve(process.cwd(), "../../docs/screenshots");
mkdirSync(SHOTS, { recursive: true });

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function shot(page: Page, project: string, name: string) {
  const size = project === "iphone" ? "390x844" : "1440x900";
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/${size}-${name}.png` });
}

async function scrollTop(page: Page) {
  await page.evaluate(() => {
    for (const selector of [".workspace", ".pane-edit", ".pane-export", ".pane-preview", ".pane-list"]) {
      document.querySelector(selector)?.scrollTo(0, 0);
    }
  });
}

async function startNew(page: Page, title: string) {
  await page.getByTestId("new-article").click();
  await page.getByTestId("new-title").fill(title);
  await page.getByTestId("new-kicker").fill("DRAFT · Culture");
  await page.getByTestId("new-byline").fill("Kyle McAuliffe · DRAFT");
  await page.getByTestId("new-dek").fill("A test article drafted on a phone.");
  await page.getByTestId("new-create").click();
  await expect(page.getByTestId("doc-title")).toHaveText(title);
}

async function addBlock(page: Page, type: string) {
  await page.getByTestId("add-block").click();
  await page.getByTestId(`choose-${type}`).click();
}

test.describe("drafting", () => {
  test("the three sample drafts are there on first visit and the desk explains where drafts live", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByTestId("doc-franchise-toy-aisle")).toBeVisible();
    await expect(page.getByTestId("doc-dodgers-four-million-fans")).toBeVisible();
    await expect(page.getByTestId("doc-data-with-the-stars")).toBeVisible();
    await expect(page.getByTestId("verify-franchise-toy-aisle")).toContainText("to verify");
    await expect(page.getByTestId("storage-note")).toContainText("Saved in this browser");
    await expect(page.getByTestId("doc-franchise-toy-aisle")).toContainText("Not published");
    await scrollTop(page);
    await shot(page, info.project.name, "desk");
  });

  test("create, edit, save, reload, export, import, delete", async ({ page }) => {
    await page.goto("/");
    await startNew(page, "Ballpark Test Piece");

    const first = page.locator(".item").first();
    await first.getByLabel("Text").fill("Opening paragraph with *stars* and {braces}. [VERIFY: attendance figure]");

    await addBlock(page, "heading");
    await page.locator(".item").nth(1).getByLabel("Text").fill("What the numbers say");

    await addBlock(page, "key-findings");
    const findings = page.locator(".item").nth(2);
    await findings.getByLabel("Label").first().fill("Gap");
    await findings.getByLabel("Detail").first().fill("Merch beats tickets.");

    await addBlock(page, "chart");
    const chart = page.locator(".item").nth(3);
    await chart.getByLabel("Title").fill("Franchise streams");
    await chart.getByLabel("Chart embed link").fill("https://artometrics.com/franchise");
    await chart.getByLabel("Alt text").fill("Bars comparing merchandise to box office.");
    await chart.getByLabel("Caption").fill("Source: Artometrics.");

    await addBlock(page, "callout");
    const callout = page.locator(".item").nth(4);
    await callout.getByLabel("Title").fill("Desk note");
    await callout.getByLabel("Text").fill("Draft only.");

    await addBlock(page, "image");
    const image = page.locator(".item").nth(5);
    await image.locator("input[type=file]").setInputFiles({ name: "Plate Photo.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByTestId("notice")).toContainText("Stored");
    await image.getByLabel("Alt text").fill("A single plate on a table.");

    await addBlock(page, "sources");
    const sources = page.locator(".item").nth(6);
    await sources.getByLabel("Citation").first().fill("Example Org, Annual report, 2026");
    await sources.getByLabel("Link").first().fill("https://example.com/report");

    await addBlock(page, "download");
    const download = page.locator(".item").nth(7);
    await download.getByLabel("Label").fill("Dataset (CSV)");
    await download.getByLabel("File link").fill("https://example.com/data.csv");

    await page.getByTestId("save-draft").click();
    await expect(page.getByTestId("notice")).toContainText("Draft saved");
    await expect(page.getByTestId("mast-status")).toHaveText("Draft saved");

    // Reload: the draft is still here and still a draft.
    await page.reload();
    await page.getByTestId("tab-list").click();
    await expect(page.getByTestId("doc-ballpark-test-piece")).toContainText("Not published");
    await expect(page.getByTestId("doc-ballpark-test-piece")).toContainText("1 to verify");
    await page.getByTestId("doc-ballpark-test-piece").click();
    await expect(page.locator(".item").first().getByLabel("Text")).toHaveValue(/^Opening paragraph with \*stars\*/);
    await expect(page.locator(".item")).toHaveCount(8);

    // Preview.
    await page.getByTestId("tab-preview").click();
    await expect(page.getByTestId("draft-ribbon")).toBeVisible();
    await expect(page.getByTestId("verify-mark").first()).toContainText("VERIFY");
    await expect(page.getByTestId("preview-fallback")).toContainText("What the numbers say");
    await expect(page.getByTestId("preview-fallback")).toContainText("Example Org, Annual report, 2026");

    // Export.
    await page.getByTestId("tab-export").click();
    const text = page.getByTestId("export-text");
    await expect(text).toContainText('title: "Ballpark Test Piece"');
    await expect(text).toContainText("draft: true");
    await expect(text).toContainText('author: "Kyle McAuliffe · DRAFT"');
    await expect(text).toContainText('import { Callout, Chart, Download, KeyFindings } from');
    await expect(text).toContainText("\\{braces\\}");
    await expect(text).toContainText("## Sources");
    await expect(text).toContainText("./images/ballpark-test-piece-1-plate-photo.png");
    await expect(page.getByTestId("export-issues")).toContainText("VERIFY");

    const [mdxDownload] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-text").click()]);
    expect(mdxDownload.suggestedFilename()).toBe("ballpark-test-piece.mdx");
    const mdx = readFileSync(await mdxDownload.path(), "utf8");
    expect(mdx).toBe((await text.innerText()).replace(/\n$/, "") + "\n");
    expect(mdx.startsWith("---\n")).toBe(true);

    await page.getByTestId("flavor-md").click();
    await expect(text).not.toContainText("import {");
    await expect(text).toContainText("> [Open the chart](https://artometrics.com/franchise)");
    const [mdDownload] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-text").click()]);
    expect(mdDownload.suggestedFilename()).toBe("ballpark-test-piece.md");

    const [zip] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-bundle").click()]);
    expect(zip.suggestedFilename()).toBe("ballpark-test-piece-twilda.zip");
    const zipBytes = readFileSync(await zip.path());
    expect(zipBytes.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(zipBytes.toString("latin1")).toContain("images/ballpark-test-piece-1-plate-photo.png");

    // JSON backup, then delete, then import the backup back.
    const [json] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-json").click()]);
    const jsonPath = await json.path();
    expect(JSON.parse(readFileSync(jsonPath, "utf8")).title).toBe("Ballpark Test Piece");

    await page.getByTestId("tab-edit").click();
    await page.getByTestId("meta-summary").click();
    await page.getByTestId("delete-document").click();
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByTestId("doc-ballpark-test-piece")).toHaveCount(0);

    await page.getByTestId("import-input").setInputFiles(jsonPath);
    await expect(page.getByTestId("doc-title")).toHaveText("Ballpark Test Piece");
    await page.getByTestId("tab-list").click();
    await expect(page.getByTestId("doc-ballpark-test-piece")).toBeVisible();
  });

  test("screenshots of the Franchise sample draft", async ({ page }, info) => {
    const project = info.project.name;
    await page.goto("/");
    await page.getByTestId("doc-franchise-toy-aisle").click();
    await expect(page.getByTestId("doc-title")).toBeVisible();
    await scrollTop(page);
    await shot(page, project, "editor");
    await page.getByTestId("collapse-all").click();
    await scrollTop(page);
    await shot(page, project, "editor-outline");
    await page.getByTestId("tab-preview").click();
    await expect(page.getByTestId("verify-mark").first()).toBeVisible();
    await scrollTop(page);
    await shot(page, project, "preview");
    await page.getByTestId("tab-export").click();
    await expect(page.getByTestId("export-text")).toContainText("draft: true");
    await scrollTop(page);
    await shot(page, project, "export");
  });

  test("edits are written to the draft without pressing Save", async ({ page }) => {
    await page.goto("/");
    await startNew(page, "Autosave Piece");
    await page.locator(".item").first().getByLabel("Text").fill("Typed and not saved by hand.");
    await expect(page.getByTestId("mast-status")).toHaveText("Unsaved edits");
    await expect(page.getByTestId("mast-status")).toHaveText("Draft saved", { timeout: 6_000 });
    await page.reload();
    await page.getByTestId("tab-list").click();
    await page.getByTestId("doc-autosave-piece").click();
    await expect(page.locator(".item").first().getByLabel("Text")).toHaveValue("Typed and not saved by hand.");
  });

  test("a sample draft opens, previews its VERIFY notes, and exports Markdown with frontmatter", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("doc-data-with-the-stars").click();
    await page.getByTestId("tab-preview").click();
    await expect(page.getByTestId("verify-mark").first()).toBeVisible();
    await page.getByTestId("tab-export").click();
    await page.getByTestId("flavor-md").click();
    const text = await page.getByTestId("export-text").innerText();
    expect(text.startsWith("---\ntitle: ")).toBe(true);
    expect(text).toContain("draft: true");
    expect(text).toContain("## Sources");
    expect(text).toMatch(/\[VERIFY/);
  });

  test("publishing a draft stays a separate, confirmed step", async ({ page }) => {
    await page.goto("/");
    await startNew(page, "Separate Steps");
    await page.getByTestId("save-draft").click();
    await expect(page.getByTestId("notice")).toContainText("Draft saved");
    await page.getByTestId("tab-list").click();
    await expect(page.getByTestId("doc-separate-steps")).toContainText("Not published");
    await page.getByTestId("doc-separate-steps").click();
    await page.getByTestId("publish").click();
    await page.getByTestId("confirm-cancel").click();
    await page.getByTestId("tab-list").click();
    await expect(page.getByTestId("doc-separate-steps")).toContainText("Not published");
  });
});
