import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createFakeGithub, type FakeGithub } from "../../tests/support/fake-github";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE",
};
const SHOTS = resolve(process.cwd(), "docs/screenshots");
mkdirSync(SHOTS, { recursive: true });
const isPhone = () => test.info().project.name.startsWith("mobile");
const HOME = JSON.parse(readFileSync("content/home/draft.json", "utf8"));

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/phase2-edit-${name}-${isPhone() ? "390" : "desktop"}.png` });
}

async function open(page: Page) {
  await page.goto("/");
  await expect(page.locator("#twilda-root.twilda-live")).toBeVisible();
}

async function press(page: Page, testId: string) {
  const target = page.getByTestId(testId);
  await target.scrollIntoViewIfNeeded();
  if (isPhone()) await target.tap();
  else await target.click();
}

async function activate(page: Page, selector: string) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  if (isPhone()) await target.tap();
  else await target.click();
}

async function typeInto(page: Page, selector: string, text: string) {
  await activate(page, selector);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

async function mockGithub(page: Page, fake: FakeGithub) {
  await page.route("https://api.github.com/**", async (route: Route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const response = await fake.impl(request.url(), { method: request.method(), headers: request.headers(), body: request.postData() ?? undefined });
    return route.fulfill({ status: response.status, headers: { ...CORS, "content-type": "application/json" }, body: await response.text() });
  });
}

async function useToken(page: Page) {
  await page.getByTestId("publish-open").click();
  await page.locator("summary", { hasText: "token" }).click();
  await page.getByTestId("token-input").fill("github_pat_example");
  await page.getByTestId("token-use").click();
}

async function bigPng(page: Page) {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1500;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a1714";
    ctx.fillRect(0, 0, 2400, 1500);
    ctx.fillStyle = "#c25b2a";
    ctx.fillRect(200, 200, 1200, 600);
    const blob: Blob = await new Promise((done) => canvas.toBlob((value) => done(value!), "image/png"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let text = "";
    for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(text);
  });
  return { name: "Night Yard.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
}

test.describe("click-to-edit with the phase 2 tools", () => {
  test("undo and redo step through edits", async ({ page }) => {
    await open(page);
    const kicker = page.locator('[data-twilda-ref="kicker"]');
    await expect(page.getByTestId("undo")).toBeDisabled();
    await typeInto(page, '[data-twilda-ref="kicker"]', "Demo issue 02");
    await expect(page.getByTestId("undo")).toBeEnabled();
    await press(page, "undo");
    await expect(kicker).toHaveText("Demo issue 01");
    await expect(page.getByTestId("status")).toContainText("No edits");
    await press(page, "redo");
    await expect(kicker).toHaveText("Demo issue 02");
    await shot(page, "undo");
  });

  test("sections: move, copy, remove, add from the library, then undo", async ({ page }) => {
    await open(page);
    const types = () => page.locator("#twilda-root [data-twilda-node]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-twilda-node-type")));
    const start = await types();
    await press(page, "structure");
    await shot(page, "structure");
    if (isPhone()) {
      for (const id of ["node-up-1", "node-down-1", "node-dup-1", "node-remove-1"]) {
        const box = await page.getByTestId(id).boundingBox();
        expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(43);
      }
    }
    await press(page, "node-down-0");
    expect(await types()).toEqual([start[1], start[0], ...start.slice(2)]);
    await press(page, "node-dup-0");
    expect((await types()).length).toBe(start.length + 1);
    await press(page, "node-remove-0");
    expect((await types()).length).toBe(start.length);
    await press(page, "node-add-0");
    await expect(page.getByTestId("library-sheet")).toBeVisible();
    await shot(page, "library");
    await page.getByTestId("library-list").locator("button").first().click();
    expect((await types()).length).toBe(start.length + 1);
    for (let i = 0; i < 4; i += 1) await press(page, "undo");
    expect(await types()).toEqual(start);
    await page.reload();
    await expect(page.locator("#twilda-root.twilda-live")).toBeVisible();
    expect(await types()).toEqual(start);
  });

  test("a photo is uploaded, resized, shown, and committed in the pull request", async ({ page }) => {
    const fake = createFakeGithub();
    fake.putMain("content/home/draft.json", JSON.stringify(HOME));
    await mockGithub(page, fake);
    await open(page);
    await activate(page, '[data-twilda-ref="sections.0.slides.0.image"]');
    await page.getByTestId("image-upload").setInputFiles(await bigPng(page));
    await expect(page.getByTestId("image-status")).toContainText("Uploaded");
    await page.getByTestId("alt-input").fill("A night yard.");
    await page.getByTestId("alt-input").press("Tab");
    await shot(page, "upload");
    await page.getByTestId("image-close").click();
    const img = page.locator('[data-twilda-ref="sections.0.slides.0.image"]');
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeLessThanOrEqual(1600);
    expect(await img.evaluate((el: HTMLImageElement) => el.currentSrc.startsWith("data:image/jpeg"))).toBe(true);

    await page.reload();
    await expect(page.locator("#twilda-root.twilda-live")).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

    await useToken(page);
    await press(page, "publish-submit");
    await expect(page.getByTestId("pr-link")).toBeVisible();
    const media = [...(fake.branches.get("twilda/draft/home")?.keys() ?? [])].filter((path) => path.startsWith("public/media/"));
    expect(media).toHaveLength(1);
    expect(media[0]).toMatch(/\.jpg$/);
    expect(fake.read("twilda/draft/home", media[0]!)?.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    const published = JSON.parse(fake.readText("twilda/draft/home", "content/home/published.json") ?? "{}");
    expect(published.sections[0].slides[0].image).toBe(`/${media[0]!.replace("public/", "")}`);
    expect(JSON.stringify(published)).not.toContain("data:image");
  });

  test("a moved main is merged quietly when nothing overlaps, and asks when it does", async ({ page }) => {
    const fake = createFakeGithub();
    const theirs = structuredClone(HOME);
    theirs.dek = "Changed on main by someone else.";
    fake.putMain("content/home/draft.json", JSON.stringify(theirs));
    await mockGithub(page, fake);
    await open(page);
    await typeInto(page, '[data-twilda-ref="kicker"]', "Mine, a different field");
    await useToken(page);
    await press(page, "publish-submit");
    await expect(page.getByTestId("pr-link")).toBeVisible();
    await expect(page.getByTestId("publish-result")).toContainText("merged with it");
    const merged = JSON.parse(fake.readText("twilda/draft/home", "content/home/published.json") ?? "{}");
    expect(merged.kicker).toBe("Mine, a different field");
    expect(merged.dek).toBe("Changed on main by someone else.");
    expect(fake.pulls).toHaveLength(1);
  });

  test("the same field changed on both sides shows both and publishes the choice", async ({ page }) => {
    const fake = createFakeGithub();
    const theirs = structuredClone(HOME);
    theirs.title = "Their Title";
    fake.putMain("content/home/draft.json", JSON.stringify(theirs));
    await mockGithub(page, fake);
    await open(page);
    await typeInto(page, '[data-twilda-ref="title"]', "My Title");
    await useToken(page);
    await press(page, "publish-submit");
    await expect(page.getByTestId("conflicts")).toBeVisible();
    await expect(page.getByTestId("conflict-0")).toContainText("Their Title");
    await expect(page.getByTestId("conflict-0")).toContainText("My Title");
    await shot(page, "conflict");
    expect(fake.writes()).toHaveLength(0);
    await page.getByTestId("conflict-0-theirs").check();
    await press(page, "conflict-apply");
    await expect(page.getByTestId("pr-link")).toBeVisible();
    const published = JSON.parse(fake.readText("twilda/draft/home", "content/home/published.json") ?? "{}");
    expect(published.title).toBe("Their Title");
  });

  test("no sideways scroll with the full bar on the phone", async ({ page }) => {
    test.skip(!isPhone(), "phone only");
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    for (const id of ["undo", "redo", "structure", "outlines", "reset", "publish-open"]) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(43);
    }
    await shot(page, "bar");
  });
});
