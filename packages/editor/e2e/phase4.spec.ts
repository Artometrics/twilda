import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SHOTS = resolve(process.cwd(), "../../docs/screenshots");
mkdirSync(SHOTS, { recursive: true });

const isPhone = () => test.info().project.name === "iphone";

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/phase4-${name}-${isPhone() ? "390" : "desktop"}.png` });
}

async function show(page: Page, tab: "list" | "page" | "edit" | "theme") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

async function chooseMode(page: Page, mode: "corporate" | "magazine" | "leadgen") {
  await show(page, "theme");
  await page.getByTestId(`mode-${mode}`).check({ force: true });
  await page.getByTestId("mode-apply").click();
  await expect(page.getByTestId("mode-current")).toContainText(
    { corporate: "Corporate", magazine: "Magazine", leadgen: "Lead generation" }[mode],
  );
}

async function createFromTemplate(page: Page, template: string, title: string) {
  await show(page, "list");
  await page.getByTestId("new-article").click();
  await page.getByTestId(`template-${template}`).check({ force: true });
  await page.getByTestId("new-title").fill(title);
  await page.getByTestId("new-create").click();
  await expect(page.getByTestId("page-canvas")).toBeVisible();
  await expect(page.getByTestId("page-canvas").locator(".magazine")).toBeVisible();
}

test.describe("phase 4: modes in the desk", () => {
  test("the mode picker restyles the page, and the new-draft sheet offers that mode's templates", async ({ page }) => {
    await page.goto("/");
    await show(page, "list");
    await page.getByTestId("new-article").click();
    await expect(page.getByTestId("template-company-home")).toHaveCount(0);
    await expect(page.getByTestId("template-front-page")).toBeAttached();
    await page.keyboard.press("Escape");

    await createFromTemplate(page, "front-page", "Mode Walk");
    await chooseMode(page, "corporate");
    await show(page, "page");
    const canvas = page.getByTestId("page-canvas");
    await expect(canvas.locator(".magazine.mode-corporate")).toHaveCount(1);
    await expect(canvas.locator(".mast .mark")).toHaveText("Brightline");
    expect(await canvas.evaluate((el) => getComputedStyle(el).getPropertyValue("--site-paper").trim())).toBe("#ffffff");

    await show(page, "list");
    await page.getByTestId("new-article").click();
    await expect(page.getByTestId("template-company-home")).toBeAttached();
    await expect(page.getByTestId("template-front-page")).toHaveCount(0);
    await page.getByTestId("template-company-home").check({ force: true });
    await page.getByTestId("new-title").fill("Acme Studio");
    await page.getByTestId("new-create").click();
    await expect(canvas.locator("h1")).toHaveCount(1);
    await expect(canvas.locator("h1")).toHaveText("Acme Studio");
    await shot(page, "corporate-home");

    await chooseMode(page, "leadgen");
    await show(page, "page");
    await expect(canvas.locator(".magazine.mode-leadgen")).toHaveCount(1);
    await expect(canvas.locator(".mast .mark")).toHaveText("Launchpad");
    await shot(page, "leadgen-switch");
  });

  test("an edited masthead survives a mode switch", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "front-page", "Keep My Name");
    await show(page, "theme");
    await page.getByTestId("chrome-name").fill("My Real Paper");
    await page.getByTestId("mode-corporate").check({ force: true });
    await expect(page.getByTestId("mode-apply")).toContainText("keep my masthead");
    await page.getByTestId("mode-apply").click();
    await show(page, "page");
    await expect(page.getByTestId("page-canvas").locator(".mast .mark")).toHaveText("My Real Paper");
    await expect(page.getByTestId("page-canvas").locator(".magazine.mode-corporate")).toHaveCount(1);
  });

  test("the generic form edits a mode section: text, a list, a checkbox, and the one-per-line list", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "front-page", "Form Seed");
    await chooseMode(page, "corporate");
    await createFromTemplate(page, "company-home", "Form Walk");
    await show(page, "edit");

    await page.getByTestId("field-hero-primaryLabel").fill("See plans");
    await page.getByTestId("field-hero-primaryHref").fill("/#pricing");
    await page.getByTestId("add-team-members").click();
    await expect(page.getByTestId("item-team-members-1-name")).toBeVisible();
    await page.getByTestId("item-team-members-1-name").fill("Mara Quill");
    await page.getByTestId("remove-team-members-1").click();
    await expect(page.getByTestId("item-team-members-1-name")).toHaveCount(0);

    const features = page.getByTestId("item-pricing-tiers-0-features");
    await features.fill("Five seats\nShared inbox\n\n");
    await page.getByTestId("item-pricing-tiers-0-featured").check();
    await show(page, "page");
    const canvas = page.getByTestId("page-canvas");
    await expect(canvas.locator("#hero .btn-primary")).toHaveText("See plans");
    await expect(canvas.locator("#pricing .tier").first().locator(".tier-features li")).toHaveText(["Five seats", "Shared inbox"]);
    await expect(canvas.locator("#pricing .tier-featured").first()).toBeVisible();
    await shot(page, "generic-form");
  });

  test("a hostile link in a mode section never reaches the page, and hostile label text stays text", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "front-page", "Link Seed");
    await chooseMode(page, "corporate");
    await createFromTemplate(page, "company-home", "Hostile Link");
    await show(page, "edit");
    await page.getByTestId("field-hero-primaryHref").fill("javascript:alert(1)");
    await show(page, "page");
    expect(await page.getByTestId("page-canvas").locator('a[href^="javascript"]').count()).toBe(0);
    await show(page, "edit");
    await page.getByTestId("field-hero-primaryHref").fill("/#pricing");
    await page.getByTestId("field-hero-primaryLabel").fill("<img src=x onerror=alert(1)>");
    await show(page, "page");
    expect(await page.getByTestId("page-canvas").locator("img[onerror]").count()).toBe(0);
    await expect(page.getByTestId("page-canvas").locator("#hero .btn-primary")).toHaveText("<img src=x onerror=alert(1)>");
  });

  test("the page works at 320px with no sideways scroll in every mode", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    await createFromTemplate(page, "front-page", "Narrow Walk");
    for (const mode of ["corporate", "leadgen", "magazine"] as const) {
      await chooseMode(page, mode);
      await show(page, "page");
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(wide, `${mode} scrolls sideways by ${wide}px`).toBeLessThanOrEqual(0);
    }
  });
});
