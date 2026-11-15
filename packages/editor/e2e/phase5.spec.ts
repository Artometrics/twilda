import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SHOTS = resolve(process.cwd(), "../../docs/screenshots");
mkdirSync(SHOTS, { recursive: true });

const isPhone = () => test.info().project.name === "iphone";

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/phase5-${name}-${isPhone() ? "390" : "desktop"}.png` });
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

/** A company home that already carries a contact form (the template adds one). */
async function companyHome(page: Page, title: string) {
  await page.goto("/");
  await createFromTemplate(page, "front-page", `${title} seed`);
  await chooseMode(page, "corporate");
  await createFromTemplate(page, "company-home", title);
}

const noLiveForm = async (page: Page) => {
  const canvas = page.getByTestId("page-canvas");
  await expect(canvas.locator("form[action]")).toHaveCount(0);
  await expect(canvas.locator("script")).toHaveCount(0);
  await expect(canvas.locator("form fieldset[disabled]")).toHaveCount(1);
};

test.describe("phase 5: forms in the desk", () => {
  test("a company home carries a contact form that previews inert and edits like any section", async ({ page }) => {
    await companyHome(page, "Form Walk");
    await show(page, "page");
    const canvas = page.getByTestId("page-canvas");
    await expect(canvas.locator("#enquiry.form-section")).toHaveCount(1);
    await expect(canvas.locator("#enquiry label")).not.toHaveCount(0);
    await noLiveForm(page);
    await shot(page, "form-preview");

    await show(page, "edit");
    await page.getByTestId("field-enquiry-heading").fill("Ask us anything");
    await page.getByTestId("item-enquiry-fields-0-label").fill("Your full name");
    await page.getByTestId("field-enquiry-submitLabel").fill("Send it");
    await show(page, "page");
    await expect(canvas.locator("#enquiry h2")).toHaveText("Ask us anything");
    await expect(canvas.locator("#enquiry label").first()).toContainText("Your full name");
    await expect(canvas.locator("#enquiry button[type=submit]")).toHaveText("Send it");
    await noLiveForm(page);
  });

  test("the kind can be switched, and a field can be added and removed", async ({ page }) => {
    await companyHome(page, "Kind Walk");
    await show(page, "edit");
    page.on("dialog", (dialog) => void dialog.accept());
    await page.getByTestId("form-starter-kind-enquiry").selectOption("newsletter");
    await page.getByTestId("form-starter-apply-enquiry").click();
    await show(page, "page");
    const canvas = page.getByTestId("page-canvas");
    await expect(canvas.locator("#enquiry.form-newsletter")).toHaveCount(1);
    await show(page, "edit");
    const labels = page.locator('[data-testid^="item-enquiry-fields-"][data-testid$="-label"]');
    const before = await labels.count();
    await page.getByTestId("add-enquiry-fields").click();
    await expect(labels).toHaveCount(before + 1);
    await page.getByTestId(`remove-enquiry-fields-${before}`).click();
    await expect(labels).toHaveCount(before);
  });

  test("hostile label text and wording stay text in the preview", async ({ page }) => {
    await companyHome(page, "Hostile Form");
    await show(page, "edit");
    await page.getByTestId("item-enquiry-fields-0-label").fill("<img src=x onerror=alert(1)>");
    await page.getByTestId("field-enquiry-privacy").fill("<script>alert(1)</script>");
    await show(page, "page");
    const canvas = page.getByTestId("page-canvas");
    expect(await canvas.locator("img[onerror], #enquiry script").count()).toBe(0);
    await expect(canvas.locator("#enquiry label").first()).toContainText("<img src=x onerror=alert(1)>");
    await noLiveForm(page);
  });

  test("the form address is checked before it is saved, and the policy it needs is shown", async ({ page }) => {
    await companyHome(page, "Address Walk");
    await show(page, "theme");
    const endpoint = page.getByTestId("forms-endpoint");
    await expect(endpoint).toBeVisible();

    for (const bad of ["http://forms.example.com/f", "javascript:alert(1)", "https://*.example.com/f", "https://127.0.0.1/f", "https://forms.example.com/a;b"]) {
      await endpoint.fill(bad);
      await expect(page.getByTestId("forms-endpoint-error")).toBeVisible();
      await expect(page.getByTestId("forms-policy")).toHaveCount(0);
    }

    await endpoint.fill("https://formspree.io/f/abc123");
    await expect(page.getByTestId("forms-endpoint-ok")).toContainText("https://formspree.io");
    await expect(page.getByTestId("forms-endpoint-error")).toHaveCount(0);
    await page.getByTestId("forms-policy").locator("summary").click();
    const policy = page.getByTestId("forms-policy").locator("pre");
    await expect(policy).toContainText("form-action https://formspree.io");
    await expect(policy).toContainText("connect-src https://formspree.io");
    await expect(policy).not.toContainText("*");

    await page.getByTestId("forms-mode").selectOption("post");
    await page.getByTestId("forms-policy").locator("summary").click();
    await expect(policy).toContainText("connect-src 'none'");
    await expect(page.getByTestId("forms-format")).toBeDisabled();
    await shot(page, "forms-card");

    await show(page, "page");
    await noLiveForm(page);

    await show(page, "theme");
    await endpoint.fill("");
    await expect(page.getByTestId("forms-no-address")).toBeVisible();
  });

  test("the form section fits at 320px with no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await companyHome(page, "Narrow Form");
    await show(page, "page");
    await page.getByTestId("page-canvas").locator("#enquiry").scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await show(page, "edit");
    await expect(page.getByTestId("form-starter-kind-enquiry")).toBeVisible();
  });
});
