import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SHOTS = resolve(process.cwd(), "../../docs/screenshots");
mkdirSync(SHOTS, { recursive: true });

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE",
};

function isPhone() {
  return test.info().project.name === "iphone";
}

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/phase1-${name}-${isPhone() ? "390" : "desktop"}.png` });
}

async function show(page: Page, tab: "list" | "page" | "edit") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

async function activate(page: Page, selector: string) {
  const target = page.locator(`[data-testid="page-canvas"] ${selector}`).first();
  await target.scrollIntoViewIfNeeded();
  if (isPhone()) await target.tap();
  else await target.click();
}

async function typeInto(page: Page, selector: string, text: string) {
  await activate(page, selector);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(text);
  const multiline = await page.locator(`[data-testid="page-canvas"] ${selector}`).first().getAttribute("data-twilda-type");
  if (multiline === "multiline") await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  else await page.keyboard.press("Enter");
}

async function createFromTemplate(page: Page, template: string, title: string) {
  await show(page, "list");
  await page.getByTestId("new-article").click();
  await page.getByTestId(`template-${template}`).check({ force: true });
  await page.getByTestId("new-title").fill(title);
  await page.getByTestId("new-kicker").fill("DRAFT · Demo");
  await page.getByTestId("new-dek").fill("A fictional draft made from a template.");
  await page.getByTestId("new-create").click();
  await expect(page.getByTestId("page-canvas").locator('[data-twilda-ref="title"]')).toHaveText(title);
}

test.describe("phase 1 desk", () => {
  test("a new draft from a template is the real template, with its plates", async ({ page }) => {
    await page.goto("/");
    await show(page, "list");
    await page.getByTestId("new-article").click();
    await expect(page.getByTestId("template-outline")).toContainText("Paragraph");
    await page.getByTestId("template-feature").check({ force: true });
    await expect(page.getByTestId("template-outline")).toContainText("Key findings");
    await page.getByTestId("new-title").fill("Template Check");
    await shot(page, "new-draft");
    await page.getByTestId("new-create").click();

    const canvas = page.getByTestId("page-canvas");
    await expect(canvas.locator(".magazine")).toBeVisible();
    await expect(canvas.locator('h1[data-twilda-ref="title"]')).toHaveText("Template Check");
    await expect(canvas.locator(".mast")).toContainText("Field Desk");
    const banner = canvas.locator('img[data-twilda-ref="blocks.0.src"]');
    await expect(banner).toBeVisible();
    await expect.poll(() => banner.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expect(canvas.locator(".plate-missing")).toHaveCount(0);
    await expect(page.getByTestId("plate-note")).toHaveCount(0);
    await expect(page.getByTestId("draft-ribbon")).toBeVisible();
    expect(await canvas.locator("a[href]").count()).toBe(0);

    await show(page, "edit");
    await expect(page.locator(".item")).toHaveCount(7);
  });

  test("text is edited where it sits and lands in the draft, the form, and the list", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "blank-article", "Edit In Place");

    await typeInto(page, '[data-twilda-ref="title"]', "Edited On The Page");
    await expect(page.getByTestId("page-canvas").locator('[data-twilda-ref="title"]')).toHaveText("Edited On The Page");
    await expect(page.getByTestId("notice")).toContainText("Draft saved on this device", { timeout: 6_000 });

    await typeInto(page, '[data-twilda-ref="blocks.0.text"]', "A sentence typed straight onto the page.");
    await page.getByTestId("save-draft").click();
    await expect(page.getByTestId("notice")).toContainText("Draft saved. The published file is unchanged.");

    await show(page, "edit");
    await expect(page.locator(".item").first().getByLabel("Text")).toHaveValue("A sentence typed straight onto the page.");
    await page.getByTestId("meta-summary").click();
    await expect(page.getByTestId("meta-title")).toHaveValue("Edited On The Page");

    await page.reload();
    await show(page, "list");
    await expect(page.getByTestId("doc-edit-in-place")).toContainText("Edited On The Page");
    await page.getByTestId("doc-edit-in-place").click();
    await expect(page.getByTestId("page-canvas")).toContainText("A sentence typed straight onto the page.");
  });

  test("a value the schema refuses is turned back and the draft is untouched", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "blank-article", "Keep My Title");
    await activate(page, '[data-twilda-ref="title"]');
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert").filter({ hasText: "title" })).toBeVisible();
    await expect(page.getByTestId("page-canvas").locator('[data-twilda-ref="title"]')).toHaveText("Keep My Title");
  });

  test("an image is swapped for another plate from the page", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Plate Swap");
    await activate(page, 'img[data-twilda-ref="blocks.0.src"]');
    const sheet = page.getByTestId("image-sheet");
    await expect(sheet).toBeVisible();
    await shot(page, "image-sheet");
    await sheet.locator('[data-src="/media/plate-map.svg"]').click();
    await expect(page.getByTestId("page-canvas").locator('img[data-twilda-ref="blocks.0.src"]')).toHaveAttribute("src", "/media/plate-map.svg");
    await page.getByTestId("image-close").click();
    await expect(page.getByTestId("notice")).toContainText("Draft saved on this device", { timeout: 6_000 });
  });

  test("the dashboard tracks draft and published status, filters, and last edited", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "short-note", "Status Walk");
    await show(page, "list");

    const card = page.getByTestId("doc-status-walk");
    await expect(page.getByTestId("status-status-walk")).toHaveText("Draft · Not published");
    await expect(page.getByTestId("edited-status-walk")).toContainText(/Edited just now|Edited \d+ seconds? ago|Edited 1 minute ago/);

    await page.getByTestId("filter-published").click();
    await expect(card).toHaveCount(0);
    await page.getByTestId("filter-draft-only").click();
    await expect(card).toBeVisible();
    await page.getByTestId("filter-all").click();
    await page.getByTestId("search-docs").fill("zzz-no-such-draft");
    await expect(page.getByTestId("no-matches")).toBeVisible();
    await page.getByTestId("search-docs").fill("status walk");
    await expect(card).toBeVisible();

    await card.click();
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("github-state")).toContainText("No token");
    await page.getByTestId("confirm-publish").click();
    await expect(page.getByTestId("notice")).toContainText("Published on this device");
    await expect(page.getByTestId("mast-status")).toHaveText("Matches published");
    await show(page, "list");
    await expect(page.getByTestId("status-status-walk")).toHaveText("Published");

    await card.click();
    await typeInto(page, '[data-twilda-ref="title"]', "Status Walk Two");
    await expect(page.getByTestId("notice")).toContainText("Draft saved on this device", { timeout: 6_000 });
    await show(page, "list");
    await expect(page.getByTestId("status-status-walk")).toHaveText("Unpublished changes");
    await page.getByTestId("filter-unpublished").click();
    await expect(page.getByTestId("doc-status-walk")).toBeVisible();
  });

  test("publish with a pasted token opens a pull request through the GitHub API (mocked)", async ({ page }) => {
    const puts: { path: string; body: { content: string; branch: string }; auth: string | undefined }[] = [];
    let pull: { title: string; head: string; base: string } | undefined;
    await page.route("https://api.github.com/**", async (route: Route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const url = new URL(request.url());
      const reply = (status: number, body: unknown) =>
        route.fulfill({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
      const repo = "/repos/Artometrics/twilda";
      if (request.method() === "GET" && url.pathname === `${repo}/git/ref/heads/twilda/draft/token-publish`) return reply(404, { message: "Not Found" });
      if (request.method() === "GET" && url.pathname === `${repo}/git/ref/heads/main`) return reply(200, { object: { sha: "base-sha" } });
      if (request.method() === "POST" && url.pathname === `${repo}/git/refs`) return reply(201, { object: { sha: "base-sha" } });
      if (request.method() === "GET" && url.pathname.startsWith(`${repo}/contents/`)) return reply(404, { message: "Not Found" });
      if (request.method() === "PUT" && url.pathname.startsWith(`${repo}/contents/`)) {
        puts.push({ path: url.pathname.replace(`${repo}/contents/`, ""), body: request.postDataJSON(), auth: request.headers().authorization });
        return reply(201, { commit: { sha: "commit-1" }, content: { path: "x" } });
      }
      if (request.method() === "GET" && url.pathname === `${repo}/pulls`) return reply(200, []);
      if (request.method() === "POST" && url.pathname === `${repo}/pulls`) {
        pull = request.postDataJSON();
        return reply(201, { number: 9, html_url: "https://github.com/Artometrics/twilda/pull/9", title: pull?.title, state: "open", head: { ref: pull?.head }, base: { ref: "main" } });
      }
      return reply(500, { message: `unmocked ${request.method()} ${url.pathname}` });
    });

    await page.goto("/");
    await createFromTemplate(page, "blank-article", "Token Publish");
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("device-flow")).toHaveCount(0);
    await page.getByTestId("github-token").fill("github_pat_example");
    await expect(page.getByTestId("github-state")).toContainText("Token set for this tab");
    await shot(page, "publish");
    await page.getByTestId("confirm-publish").click();
    await expect(page.getByTestId("notice")).toContainText("https://github.com/Artometrics/twilda/pull/9");

    expect(puts.map((entry) => entry.path)).toEqual(["content/articles/token-publish.json"]);
    expect(puts[0]?.body.branch).toBe("twilda/draft/token-publish");
    expect(puts[0]?.auth).toBe("Bearer github_pat_example");
    const written = JSON.parse(Buffer.from(puts[0]!.body.content, "base64").toString("utf8"));
    expect(written.status).toBe("published");
    expect(written.title).toBe("Token Publish");
    expect(pull).toMatchObject({ head: "twilda/draft/token-publish", base: "main" });

    const stored = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]));
    expect(stored).not.toContain("github_pat_example");
  });

  test("no sideways scroll on the phone, and the main controls are easy to tap", async ({ page }) => {
    test.skip(!isPhone(), "phone only");
    await page.goto("/");
    await createFromTemplate(page, "feature", "Phone Fit");
    for (const view of ["page", "edit"] as const) {
      await show(page, view);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
    await show(page, "page");
    for (const id of ["save-draft", "publish", "outlines", "tab-list", "tab-page", "tab-edit"]) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(36);
    }
  });

  test("screenshots of the dashboard and the page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("doc-franchise-toy-aisle")).toBeVisible();
    await shot(page, "dashboard");
    await createFromTemplate(page, "feature", "Lumen Rail Adds A Night Line");
    await page.getByTestId("page-canvas").evaluate((el) => el.scrollIntoView());
    await page.evaluate(() => document.querySelector(".pane-page")?.scrollTo(0, 0));
    await shot(page, "page");
    await typeInto(page, '[data-twilda-ref="blocks.1.text"]', "The night line runs from the yard to the river. Tap any text like this to edit it where it sits.");
    await expect(page.getByTestId("notice")).toContainText("Draft saved on this device", { timeout: 6_000 });
    await page.locator('[data-twilda-ref="blocks.1.text"]').evaluate((el) => el.scrollIntoView({ block: "center" }));
    await shot(page, "edited");
    await show(page, "edit");
    await page.evaluate(() => document.querySelector(".side, .pane-edit")?.scrollTo(0, 0));
    await shot(page, "blocks");
  });
});
