import { expect, test, type Page } from "@playwright/test";

/**
 * The click-to-edit build under the policy `astro preview` sends for it (`astro.edit.config.ts`).
 * It is never deployed, but it holds a token in memory and renders draft content, so it gets the same strictness.
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE",
};

async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${event.violatedDirective} blocked ${event.blockedURI || "inline"}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
}

test.describe("click-to-edit under its Content-Security-Policy", () => {
  test("the page is served with a strict policy and no inline script or style", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/unsafe-(inline|eval)/);
    expect(csp).toContain("https://device-proxy.test");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    const html = await response!.text();
    expect(html).not.toMatch(/<style[\s>]/i);
    expect(html).not.toMatch(/\sstyle=/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    for (const script of html.match(/<script[^>]*>/gi) ?? []) {
      expect(script, script).toMatch(/type="application\/json"|src="\/_astro\//);
    }
  });

  test("editing, the image sheet, sign-in through the proxy and sign-out raise no violation", async ({ page }) => {
    const violations = await watchViolations(page);
    await page.route("https://device-proxy.test/**", async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      const json = (body: unknown) => route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname === "/login/device/code") {
        return json({ device_code: "dev-1", user_code: "WDJB-MJHT", verification_uri: "javascript:window.__pwned=1", expires_in: 900, interval: 1 });
      }
      return json({ access_token: "gho_csp_walk_token", token_type: "bearer" });
    });
    await page.goto("/");
    await expect(page.locator("#twilda-root.twilda-live")).toBeVisible();

    const title = page.locator('[data-twilda-ref="sections.0.slides.0.title"]').first();
    await title.scrollIntoViewIfNeeded();
    if (test.info().project.name.startsWith("mobile")) await title.tap();
    else await title.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Policy walk");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("status")).toContainText("1 edit");

    await page.getByTestId("publish-open").click();
    await page.getByTestId("signin-start").click();
    await expect(page.getByTestId("user-code")).toHaveText("WDJB-MJHT");
    const verify = page.getByTestId("publish-sheet").locator("a[href]").first();
    expect(await verify.getAttribute("href")).toBe("https://github.com/login/device");
    await expect(page.getByTestId("signed-in")).toBeVisible({ timeout: 10_000 });

    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toContain("gho_csp_walk_token");

    await page.getByTestId("signout").click();
    await expect(page.getByTestId("signed-in")).toBeHidden();
    await expect(page.getByTestId("signin-start")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    expect(await violations()).toEqual([]);
  });
});
