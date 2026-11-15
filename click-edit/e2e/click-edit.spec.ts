import { expect, test, type Page, type Route } from "@playwright/test";

const DRAFT_KEY = "twilda:click-edit:draft:home";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE",
};

async function open(page: Page) {
  await page.goto("/");
  await expect(page.locator("#twilda-root.twilda-live")).toBeVisible();
}

async function activate(page: Page, selector: string) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  if (test.info().project.name.startsWith("mobile")) await target.tap();
  else await target.click();
}

async function typeInto(page: Page, selector: string, text: string) {
  await activate(page, selector);
  await page.keyboard.press("ControlOrMeta+A");
  if (text) await page.keyboard.type(text);
  else await page.keyboard.press("Backspace");
  await page.keyboard.press("Enter");
}

function storedDraft(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), DRAFT_KEY);
}

test.describe("click-to-edit prototype", () => {
  test("annotates the real template and neutralises links", async ({ page }) => {
    await open(page);
    expect(await page.locator("[data-twilda-ref]").count()).toBeGreaterThan(40);
    await expect(page.locator('[data-twilda-ref="title"]')).toHaveText("Field Desk");
    await expect(page.locator('[data-twilda-ref="sections.0.slides.0.image"]')).toHaveAttribute("data-twilda-type", "image");
    expect(await page.locator("#twilda-root a[href]").count()).toBe(0);
  });

  test("edits text inline, saves a local draft, and keeps it after reload", async ({ page }) => {
    await open(page);
    await typeInto(page, '[data-twilda-ref="sections.0.slides.0.title"]', "Lumen Rail runs all night");
    await expect(page.getByTestId("status")).toContainText("1 edit");
    await expect(page.getByTestId("status")).toContainText("draft saved on this device");
    const stored = await storedDraft(page);
    expect(stored.sections[0].slides[0].title).toBe("Lumen Rail runs all night");
    expect(stored.status).toBe("draft");

    await page.reload();
    await expect(page.locator('[data-twilda-ref="sections.0.slides.0.title"]')).toHaveText("Lumen Rail runs all night");
    await expect(page.getByTestId("status")).toContainText("1 edit");
    await expect(page.locator('[data-twilda-ref="title"]')).toHaveText("Field Desk");
  });

  test("rejects a value the schema refuses and restores the text", async ({ page }) => {
    await open(page);
    await typeInto(page, '[data-twilda-ref="title"]', "");
    await expect(page.getByRole("alert")).toContainText("title");
    await expect(page.locator('[data-twilda-ref="title"]')).toHaveText("Field Desk");
    expect(await storedDraft(page)).toBeNull();
  });

  test("swaps an image and its alt text", async ({ page }) => {
    await open(page);
    await activate(page, '[data-twilda-ref="sections.0.slides.0.image"]');
    const sheet = page.getByTestId("image-sheet");
    await expect(sheet).toBeVisible();
    await sheet.locator('[data-src="/media/plate-map.svg"]').click();
    await expect(page.locator('[data-twilda-ref="sections.0.slides.0.image"]')).toHaveAttribute("src", "/media/plate-map.svg");
    await page.getByTestId("alt-input").fill("A map plate");
    await page.getByTestId("alt-input").press("Tab");
    await expect(page.locator('[data-twilda-ref="sections.0.slides.0.image"]')).toHaveAttribute("alt", "A map plate");
    const stored = await storedDraft(page);
    expect(stored.sections[0].slides[0].image).toBe("/media/plate-map.svg");
    expect(stored.sections[0].slides[0].imageAlt).toBe("A map plate");
    await page.getByTestId("image-close").click();
    await expect(sheet).toBeHidden();
  });

  test("reset discards local edits", async ({ page }) => {
    await open(page);
    await typeInto(page, '[data-twilda-ref="kicker"]', "Demo issue 02");
    await expect(page.getByTestId("status")).toContainText("1 edit");
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByTestId("reset").click();
    await expect(page.locator('[data-twilda-ref="kicker"]')).toHaveText("Demo issue 01");
    expect(await storedDraft(page)).toBeNull();
  });

  test("mobile layout has no sideways scroll and shows outlines without hover", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("mobile"), "phone only");
    await open(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator("#twilda-root")).toHaveClass(/twilda-outlines/);
    const box = await page.getByTestId("publish-open").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("desktop hover shows an overlay with the field name", async ({ page }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "hover is a desktop affordance");
    await open(page);
    await page.locator('[data-twilda-ref="title"]').hover();
    await expect(page.locator(".twilda-overlay")).toBeVisible();
    await expect(page.locator(".twilda-chip")).toHaveText("Edit title");
  });

  test("publish opens a pull request through the GitHub API (mocked)", async ({ page }) => {
    const puts: { path: string; body: { content: string; branch: string; message: string }; auth: string | undefined }[] = [];
    let pulls: { title: string; head: string; base: string; body: string } | undefined;
    let polls = 0;

    await page.route("https://device-proxy.test/**", async (route) => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const url = new URL(route.request().url());
      const json = (body: unknown) => route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname === "/login/device/code") {
        return json({ device_code: "dev-1", user_code: "WDJB-MJHT", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 1 });
      }
      polls += 1;
      return json(polls < 2 ? { error: "authorization_pending" } : { access_token: "gho_test_token", token_type: "bearer" });
    });

    await page.route("https://api.github.com/**", async (route: Route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const url = new URL(request.url());
      const reply = (status: number, body: unknown) => route.fulfill({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
      const repo = "/repos/Artometrics/twilda";
      if (request.method() === "GET" && url.pathname === `${repo}/git/ref/heads/twilda/draft/home`) return reply(404, { message: "Not Found" });
      if (request.method() === "GET" && url.pathname === `${repo}/git/ref/heads/main`) return reply(200, { object: { sha: "base-sha" } });
      if (request.method() === "POST" && url.pathname === `${repo}/git/refs`) return reply(201, { object: { sha: "base-sha" } });
      if (request.method() === "GET" && url.pathname.startsWith(`${repo}/contents/`)) return reply(404, { message: "Not Found" });
      if (request.method() === "PUT" && url.pathname.startsWith(`${repo}/contents/`)) {
        puts.push({ path: url.pathname.replace(`${repo}/contents/`, ""), body: request.postDataJSON(), auth: request.headers().authorization });
        return reply(201, { commit: { sha: `commit-${puts.length}` }, content: { path: "x" } });
      }
      if (request.method() === "GET" && url.pathname === `${repo}/pulls`) return reply(200, []);
      if (request.method() === "POST" && url.pathname === `${repo}/pulls`) {
        pulls = request.postDataJSON();
        return reply(201, { number: 7, html_url: "https://github.com/Artometrics/twilda/pull/7", title: pulls?.title, state: "open", head: { ref: pulls?.head }, base: { ref: "main" } });
      }
      return reply(500, { message: `unmocked ${request.method()} ${url.pathname}` });
    });

    await open(page);
    await typeInto(page, '[data-twilda-ref="sections.0.slides.0.title"]', "Lumen Rail runs all night");
    await page.getByTestId("publish-open").click();
    await expect(page.getByTestId("publish-summary")).toContainText("1 edited field");
    await expect(page.getByTestId("publish-changes")).toContainText("sections.0.slides.0.title");

    await page.getByTestId("signin-start").click();
    await expect(page.getByTestId("user-code")).toHaveText("WDJB-MJHT");
    await expect(page.getByTestId("signed-in")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("publish-submit").click();
    await expect(page.getByTestId("pr-link")).toHaveAttribute("href", "https://github.com/Artometrics/twilda/pull/7");

    expect(puts.map((entry) => entry.path)).toEqual(["content/home/draft.json", "content/home/published.json"]);
    expect(puts.every((entry) => entry.body.branch === "twilda/draft/home")).toBe(true);
    expect(puts.every((entry) => entry.auth === "Bearer gho_test_token")).toBe(true);
    const draft = JSON.parse(Buffer.from(puts[0]!.body.content, "base64").toString("utf8"));
    const published = JSON.parse(Buffer.from(puts[1]!.body.content, "base64").toString("utf8"));
    expect(draft.status).toBe("draft");
    expect(published.status).toBe("published");
    expect(published.sections[0].slides[0].title).toBe("Lumen Rail runs all night");
    expect(pulls).toMatchObject({ head: "twilda/draft/home", base: "main" });
    expect(pulls?.body).toContain("sections.0.slides.0.title");
  });

  test("device flow that the browser cannot reach explains the CORS problem", async ({ page }) => {
    await page.route("https://device-proxy.test/**", (route) => route.abort("failed"));
    await open(page);
    await typeInto(page, '[data-twilda-ref="kicker"]', "Demo issue 02");
    await page.getByTestId("publish-open").click();
    await page.getByTestId("signin-start").click();
    await expect(page.getByTestId("publish-result")).toContainText("proxy");
  });

  test("token fallback signs in without a device flow", async ({ page }) => {
    await open(page);
    await typeInto(page, '[data-twilda-ref="kicker"]', "Demo issue 02");
    await page.getByTestId("publish-open").click();
    await page.locator("summary", { hasText: "Use a token instead" }).click();
    await page.getByTestId("token-input").fill("github_pat_example");
    await page.getByTestId("token-use").click();
    await expect(page.getByTestId("signed-in")).toBeVisible();
  });
});

test.describe("screenshots", () => {
  test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to write docs/screenshots");

  test("captures the demo states", async ({ page }, info) => {
    const tag = info.project.name.startsWith("mobile") ? "390" : "desktop";
    const out = (name: string) => ({ path: `docs/screenshots/phase0-${name}-${tag}.png` });
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (tag === "desktop") await page.locator('[data-twilda-ref="title"]').hover();
    await page.screenshot(out("page"));
    const slideTitle = page.locator('[data-twilda-ref="sections.0.slides.0.title"]');
    await typeInto(page, '[data-twilda-ref="sections.0.slides.0.title"]', "Lumen Rail runs all night");
    await slideTitle.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.screenshot(out("text-edited"));
    await activate(page, '[data-twilda-ref="sections.0.slides.0.image"]');
    await page.getByTestId("image-sheet").locator('[data-src="/media/plate-map.svg"]').click();
    await page.screenshot(out("image-sheet"));
    await page.getByTestId("image-close").click();
    await page.getByTestId("publish-open").click();
    await page.screenshot(out("publish-sheet"));
  });
});
