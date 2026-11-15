import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createFakeGithub, type FakeGithub } from "../../../tests/support/fake-github";

const SHOTS = resolve(process.cwd(), "../../docs/screenshots");
mkdirSync(SHOTS, { recursive: true });

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE",
};

const isPhone = () => test.info().project.name === "iphone";

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/phase2-${name}-${isPhone() ? "390" : "desktop"}.png` });
}

async function show(page: Page, tab: "list" | "page" | "edit" | "theme") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

async function press(page: Page, testId: string) {
  const target = page.getByTestId(testId);
  await target.scrollIntoViewIfNeeded();
  if (isPhone()) await target.tap();
  else await target.click();
}

async function tapNode(page: Page, selector: string) {
  const target = page.locator(`[data-testid="page-canvas"] ${selector}`).first();
  await target.scrollIntoViewIfNeeded();
  if (isPhone()) await target.tap();
  else await target.click();
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

/** Select characters [start, end) of an element's text, the way a long-press and drag would. */
async function selectText(page: Page, selector: string, start: number, end: number) {
  await page.locator(`[data-testid="page-canvas"] ${selector}`).first().evaluate(
    (element, [from, to]) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let seen = 0;
      let started = false;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const length = (node.textContent ?? "").length;
        if (!started && from! <= seen + length) {
          range.setStart(node, from! - seen);
          started = true;
        }
        if (started && to! <= seen + length) {
          range.setEnd(node, to! - seen);
          break;
        }
        seen += length;
      }
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    },
    [start, end],
  );
}

async function replaceText(page: Page, selector: string, text: string) {
  await tapNode(page, selector);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(text);
}

async function finishText(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

async function bigPng(page: Page, width: number, height: number): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w!;
      canvas.height = h!;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, w!, h!);
      gradient.addColorStop(0, "#1a1714");
      gradient.addColorStop(1, "#c25b2a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w!, h!);
      const blob: Blob = await new Promise((done) => canvas.toBlob((value) => done(value!), "image/png"));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let text = "";
      for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(text);
    },
    [width, height],
  );
  return { name: "Yard Panorama.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
}

async function mockGithub(page: Page, fake: FakeGithub) {
  await page.route("https://api.github.com/**", async (route: Route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const response = await fake.impl(request.url(), {
      method: request.method(),
      headers: request.headers(),
      body: request.postData() ?? undefined,
    });
    return route.fulfill({
      status: response.status,
      headers: { ...CORS, "content-type": "application/json" },
      body: await response.text(),
    });
  });
}

test.describe("phase 2: marks on the live page", () => {
  test("bold, italic and a link, validated; unsafe links are refused", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Marks Walk");
    const target = '[data-twilda-ref="blocks.1.text"]';
    await replaceText(page, target, "Night trains run late and the yard stays lit.");
    await expect(page.getByTestId("marks-bar")).toBeVisible();
    await shot(page, "marks-bar");

    await selectText(page, target, 0, 5);
    await press(page, "mark-bold");
    await selectText(page, target, 6, 12);
    await press(page, "mark-italic");
    await selectText(page, target, 13, 16);
    await press(page, "mark-link");
    await page.getByTestId("link-input").fill("javascript:alert(1)");
    await press(page, "link-apply");
    await expect(page.getByTestId("link-note")).toContainText(/https|mailto|not allowed|link/i);
    await expect(page.locator(`[data-testid="page-canvas"] ${target} a`)).toHaveCount(0);

    await page.getByTestId("link-input").fill("https://example.com/timetable");
    await press(page, "link-apply");
    await finishText(page);

    const html = await page.locator(`[data-testid="page-canvas"] ${target}`).first().innerHTML();
    expect(html).toContain("<strong>Night</strong>");
    expect(html).toContain("<em>trains</em>");
    expect(html).toMatch(/<a [^>]*href="https:\/\/example\.com\/timetable"[^>]*>run<\/a>/);
    expect(html).not.toContain("javascript:");
    await expect(page.getByTestId("notice")).toContainText("Draft saved on this device", { timeout: 6_000 });
    await page.locator(`[data-testid="page-canvas"] ${target}`).first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await shot(page, "marks-result");
  });

  test("pasted markup becomes text, never elements", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Paste Walk");
    const target = '[data-twilda-ref="blocks.1.text"]';
    await tapNode(page, target);
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type('Hello <img src=x onerror="window.__pwned=1"> and <script>window.__pwned=2</script> end');
    await finishText(page);
    const canvas = page.getByTestId("page-canvas");
    await expect(canvas.locator(`${target} img, ${target} script`)).toHaveCount(0);
    await expect(canvas.locator(target).first()).toContainText("<script>");
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  });
});

test.describe("phase 2: images and uploads", () => {
  test("upload is resized and re-encoded, shown at once, and gets alt text", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Upload Walk");
    await tapNode(page, 'img[data-twilda-ref="blocks.0.src"]');
    await expect(page.getByTestId("image-sheet")).toBeVisible();
    await shot(page, "image-sheet");

    await page.getByTestId("image-upload").setInputFiles(await bigPng(page, 2600, 1700));
    await expect(page.getByTestId("image-status")).toContainText(/Uploaded/i);
    await page.getByTestId("alt-input").fill("A long yard at dusk, lamps on.");
    await page.getByTestId("alt-input").blur();
    await press(page, "image-close");

    const img = page.getByTestId("page-canvas").locator('img[data-twilda-ref="blocks.0.src"]');
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    const size = await img.evaluate((el: HTMLImageElement) => ({ w: el.naturalWidth, src: el.currentSrc }));
    expect(size.w).toBeLessThanOrEqual(1600);
    expect(size.src.startsWith("data:image/jpeg")).toBe(true);
    await expect(img).toHaveAttribute("alt", "A long yard at dusk, lamps on.");
    await expect(page.getByTestId("page-canvas").locator(".plate-missing")).toHaveCount(0);

    await show(page, "edit");
    await show(page, "page");
    await expect(page.getByTestId("notice")).toContainText("Draft saved", { timeout: 6_000 });
    await shot(page, "image-uploaded");
  });

  test("a file that is not an image is refused with a reason", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Hostile Upload");
    await tapNode(page, 'img[data-twilda-ref="blocks.0.src"]');
    for (const file of [
      { name: "evil.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') },
      { name: "page.png", mimeType: "image/png", buffer: Buffer.from("<html><script>alert(1)</script></html>") },
    ]) {
      await page.getByTestId("image-upload").setInputFiles(file);
      await expect(page.getByTestId("image-status")).toContainText(/not|only|cannot|could/i);
    }
    const src = await page.getByTestId("page-canvas").locator('img[data-twilda-ref="blocks.0.src"]').getAttribute("src");
    expect(src).not.toMatch(/evil|page\.png|svg\+xml/);
  });
});

test.describe("phase 2: video", () => {
  test("add a video block, swap in a YouTube link, and refuse everything else", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Video Walk");
    await press(page, "structure");
    await press(page, "node-add-1");
    await expect(page.getByTestId("library-sheet")).toBeVisible();
    await shot(page, "library");
    await press(page, "add-embed");
    await press(page, "structure");

    const frame = page.getByTestId("page-canvas").locator(".embed, .embed-frame, [data-twilda-type='embed']").first();
    await frame.scrollIntoViewIfNeeded();
    if (isPhone()) await frame.tap();
    else await frame.click();
    await expect(page.getByTestId("video-sheet")).toBeVisible();

    for (const bad of ["https://evil.example/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", "not a link"]) {
      await page.getByTestId("video-url").fill(bad);
      await press(page, "video-save");
      await expect(page.getByTestId("video-note")).toContainText(/YouTube|Vimeo|link/i);
    }
    await expect(page.getByTestId("page-canvas").locator("iframe[src*='evil']")).toHaveCount(0);

    await page.getByTestId("video-url").fill("https://youtu.be/dQw4w9WgXcQ?t=42&autoplay=1");
    await page.getByTestId("video-title").fill("Yard walk-through");
    await press(page, "video-save");
    await press(page, "video-close");
    const iframe = page.getByTestId("page-canvas").locator("iframe");
    await expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    await expect(iframe).toHaveAttribute("title", "Yard walk-through");
    await expect(iframe).toHaveAttribute("sandbox", /allow-scripts/);
    await expect(iframe).not.toHaveAttribute("sandbox", /allow-top-navigation/);
    await shot(page, "video");
  });
});

test.describe("phase 2: sections and blocks", () => {
  test("reorder, copy, remove and add with undo, and the controls are tap-sized", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Structure Walk");
    const ids = () =>
      page
        .getByTestId("page-canvas")
        .locator("[data-twilda-node]")
        .evaluateAll((nodes) => nodes.map((node) => `${node.getAttribute("data-twilda-node-type")}:${(node.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)}`));
    const start = await ids();
    expect(start.length).toBeGreaterThan(3);

    await press(page, "structure");
    await shot(page, "structure");
    if (isPhone()) {
      for (const id of ["node-up-1", "node-down-1", "node-dup-1", "node-remove-1", "node-add-1"]) {
        const box = await page.getByTestId(id).boundingBox();
        expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(43);
        expect(box?.width ?? 0, id).toBeGreaterThanOrEqual(43);
      }
    }

    await press(page, "node-down-1");
    const moved = await ids();
    expect(moved[2]).toBe(start[1]);
    expect(moved[1]).toBe(start[2]);

    await press(page, "node-dup-1");
    expect((await ids()).length).toBe(start.length + 1);

    await press(page, "node-remove-1");
    expect((await ids()).length).toBe(start.length);

    await press(page, "node-add-0");
    await press(page, "add-callout");
    expect((await ids()).length).toBe(start.length + 1);
    await expect(page.getByTestId("page-canvas").locator("[data-twilda-node-type='callout']").first()).toBeVisible();

    for (let i = 0; i < 4; i += 1) await press(page, "undo");
    expect(await ids()).toEqual(start);
    await expect(page.getByTestId("undo")).toBeDisabled();
    await press(page, "redo");
    expect((await ids())[2]).toBe(start[1]);
    await expect(page.getByTestId("notice")).toContainText("Draft saved", { timeout: 6_000 });
  });

  test("a page of sections: move one and add one from the library", async ({ page }) => {
    await page.goto("/?sample=field-desk");
    await show(page, "list");
    await page.getByTestId("doc-home").click();
    const types = () => page.getByTestId("page-canvas").locator("[data-twilda-node]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-twilda-node-type")));
    const start = await types();
    expect(start.length).toBeGreaterThanOrEqual(2);
    await press(page, "structure");
    await shot(page, "sections");
    await press(page, "node-down-0");
    expect(await types()).toEqual([start[1], start[0], ...start.slice(2)]);
    await press(page, "node-add-0");
    await expect(page.getByTestId("library-sheet")).toBeVisible();
    await shot(page, "section-library");
    await page.getByTestId("library-list").locator("button").first().click();
    expect((await types()).length).toBe(start.length + 1);
    await press(page, "undo");
    await press(page, "undo");
    expect(await types()).toEqual(start);
  });
});

test.describe("phase 2: undo and redo", () => {
  test("typing is undone as a unit, with the keyboard and the buttons", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Undo Walk");
    const title = page.getByTestId("page-canvas").locator('[data-twilda-ref="title"]');
    await expect(page.getByTestId("undo")).toBeDisabled();
    await tapNode(page, '[data-twilda-ref="title"]');
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Undone Title");
    await page.keyboard.press("Enter");
    await expect(title).toHaveText("Undone Title");
    await expect(page.getByTestId("undo")).toBeEnabled();
    await press(page, "undo");
    await expect(title).toHaveText("Undo Walk");
    await expect(page.getByTestId("redo")).toBeEnabled();
    await press(page, "redo");
    await expect(title).toHaveText("Undone Title");
    if (!isPhone()) {
      await page.locator("body").click({ position: { x: 2, y: 2 } });
      await page.keyboard.press("ControlOrMeta+Z");
      await expect(title).toHaveText("Undo Walk");
      await page.keyboard.press("ControlOrMeta+Shift+Z");
      await expect(title).toHaveText("Undone Title");
    }
    await shot(page, "undo");
  });
});

test.describe("phase 2: theme", () => {
  test("colors, fonts, scale and chrome change the live page and survive a reload", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Theme Walk");
    await show(page, "theme");
    await expect(page.getByTestId("theme-panel")).toBeVisible();
    await shot(page, "theme-panel");

    await page.getByTestId("theme-color-paper").fill("#10202a");
    await page.getByTestId("theme-color-ink").fill("#f4efe6");
    await page.getByTestId("chrome-name").fill("Night Desk");
    await page.getByTestId("theme-font-heading").selectOption({ index: 1 });
    await page.getByTestId("theme-base").fill("19");
    await page.getByTestId("theme-heading-scale").fill("1.4");
    await page.getByTestId("theme-spacing").fill("1.3");
    await expect(page.getByTestId("theme-contrast")).toBeVisible();

    await show(page, "page");
    const canvas = page.getByTestId("page-canvas");
    const readVar = (name: string) => canvas.evaluate((el, key) => getComputedStyle(el).getPropertyValue(key).trim(), name);
    expect(await readVar("--site-paper")).toBe("#10202a");
    expect(await readVar("--site-ink")).toBe("#f4efe6");
    await expect(canvas.locator(".mast")).toContainText("Night Desk");
    await shot(page, "theme-preview");

    await expect(page.getByTestId("notice")).toContainText("Theme saved", { timeout: 6_000 });
    await page.reload();
    await show(page, "list");
    await page.getByTestId(/^doc-/).first().click();
    await expect.poll(() => readVar("--site-paper")).toBe("#10202a");
  });

  test("a hostile color is refused and never reaches the page", async ({ page }) => {
    await page.goto("/");
    await createFromTemplate(page, "feature", "Hostile Theme");
    await show(page, "theme");
    for (const bad of ["red;}body{display:none", "url(javascript:1)", "#12345", "expression(1)"]) {
      await page.getByTestId("theme-color-paper").fill(bad);
    }
    await show(page, "page");
    const paper = await page.getByTestId("page-canvas").evaluate((el) => getComputedStyle(el).getPropertyValue("--site-paper").trim());
    expect(paper).toMatch(/^(#[0-9a-fA-F]{6})?$/);
    await expect(page.locator("body")).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).display)).not.toBe("none");
  });

  test("publishing the theme opens a pull request that changes only content/site.json", async ({ page }) => {
    const fake = createFakeGithub();
    await mockGithub(page, fake);
    await page.goto("/");
    await createFromTemplate(page, "feature", "Theme Publish");
    await show(page, "theme");
    await page.getByTestId("theme-color-kicker").fill("#2a6a5a");
    await page.getByTestId("theme-publish").click();
    await page.getByTestId("github-token").fill("github_pat_example");
    await page.getByTestId("confirm-publish-theme").click();
    await expect(page.getByTestId("notice")).toContainText("/pull/");
    expect(fake.pulls[0]?.head).toBe("twilda/site");
    const written = fake.readText("twilda/site", "content/site.json") ?? "";
    expect(JSON.parse(written).theme.colors.kicker).toBe("#2a6a5a");
    expect(fake.writes().map((call) => call.path.split("/contents/")[1])).toEqual(["content/site.json"]);
    expect(fake.read("main", "content/site.json")).toBeUndefined();
  });
});

test.describe("phase 2: publishing with images and a moved main", () => {
  test("the uploaded photo is committed in the same pull request", async ({ page }) => {
    const fake = createFakeGithub();
    await mockGithub(page, fake);
    await page.goto("/");
    await createFromTemplate(page, "feature", "Photo Publish");
    await tapNode(page, 'img[data-twilda-ref="blocks.0.src"]');
    await page.getByTestId("image-upload").setInputFiles(await bigPng(page, 1200, 800));
    await expect(page.getByTestId("image-status")).toContainText(/Uploaded/i);
    await page.getByTestId("alt-input").fill("A yard photograph.");
    await press(page, "image-close");

    await press(page, "publish");
    await page.getByTestId("github-token").fill("github_pat_example");
    await page.getByTestId("confirm-publish").click();
    await expect(page.getByTestId("notice")).toContainText("/pull/");
    const media = [...(fake.branches.get("twilda/draft/photo-publish")?.keys() ?? [])].filter((path) => path.startsWith("public/media/"));
    expect(media).toHaveLength(1);
    expect(media[0]).toMatch(/^public\/media\/[a-z0-9-]+\.jpg$/);
    const bytes = fake.read("twilda/draft/photo-publish", media[0]!);
    expect(bytes?.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    const published = JSON.parse(fake.readText("twilda/draft/photo-publish", "content/photo-publish/published.json") ?? "{}");
    expect(JSON.stringify(published)).toContain(`/${media[0]!.replace("public/", "")}`);
    expect(JSON.stringify(published)).not.toContain("data:image");
  });

  test("when main moved, the desk shows what changed and publishes the chosen side", async ({ page }) => {
    const fake = createFakeGithub();
    await mockGithub(page, fake);
    await page.goto("/");
    await createFromTemplate(page, "feature", "Moved Main");
    fake.putMain(
      "content/moved-main/draft.json",
      JSON.stringify({
        id: "moved-main",
        kind: "article",
        title: "Someone Else Retitled This",
        slug: "moved-main",
        dek: "A fictional draft made from a template.",
        kicker: "DRAFT · Demo",
        byline: "",
        status: "draft",
        updatedAt: "2026-11-15T00:00:00.000Z",
        blocks: [{ id: "p1", type: "paragraph", text: "Main has its own opening." }],
      }),
    );

    await press(page, "publish");
    await page.getByTestId("github-token").fill("github_pat_example");
    await page.getByTestId("confirm-publish").click();
    await expect(page.getByTestId("conflict-dialog")).toBeVisible();
    await shot(page, "conflict");
    expect(fake.writes()).toHaveLength(0);
    expect(fake.pulls).toHaveLength(0);

    await page.getByTestId("conflict-0-theirs").check({ force: true });
    await page.getByTestId("conflict-apply").click();
    await expect(page.getByTestId("notice")).toContainText("/pull/");
    expect(fake.pulls).toHaveLength(1);
    const published = JSON.parse(fake.readText("twilda/draft/moved-main", "content/moved-main/published.json") ?? "{}");
    expect(published.title).toBe("Someone Else Retitled This");
    expect(fake.readText("main", "content/moved-main/published.json")).toBeUndefined();
  });

  test("cancelling the conflict sheet writes nothing", async ({ page }) => {
    const fake = createFakeGithub();
    await mockGithub(page, fake);
    await page.goto("/");
    await createFromTemplate(page, "feature", "Cancel Conflict");
    fake.putMain(
      "content/cancel-conflict/draft.json",
      JSON.stringify({ id: "cancel-conflict", kind: "article", title: "Other", slug: "cancel-conflict", dek: "", kicker: "", byline: "", status: "draft", updatedAt: "2026-11-15T00:00:00.000Z", blocks: [{ id: "p1", type: "paragraph", text: "x" }] }),
    );
    await press(page, "publish");
    await page.getByTestId("github-token").fill("github_pat_example");
    await page.getByTestId("confirm-publish").click();
    await expect(page.getByTestId("conflict-dialog")).toBeVisible();
    await page.getByTestId("conflict-cancel").click();
    await expect(page.getByTestId("conflict-dialog")).toHaveCount(0);
    expect(fake.writes()).toHaveLength(0);
  });
});

test.describe("phase 2: layout", () => {
  test("no sideways scroll on the phone with every tool open", async ({ page }) => {
    test.skip(!isPhone(), "phone only");
    await page.goto("/");
    await createFromTemplate(page, "feature", "Phone Fit Two");
    await press(page, "structure");
    await press(page, "outlines");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await show(page, "theme");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});
