import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { STARTER_PORTS } from "../../playwright.starters.config";

const MODES = ["corporate", "magazine", "leadgen"] as const;
const WIDTHS = [320, 390, 1280] as const;
const SHOTS = path.resolve("docs/screenshots");

/** What the page may do: the production policy has style-src 'self' and script-src 'none'. */
const CSP =
  "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'none'; connect-src 'none'; worker-src 'none'; manifest-src 'none'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com";

async function open(page: Page, mode: (typeof MODES)[number], route: string): Promise<string[]> {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  await page.route("**/*", async (request) => {
    const response = await request.fetch();
    await request.fulfill({ response, headers: { ...response.headers(), "content-security-policy": CSP } });
  });
  await page.goto(`http://127.0.0.1:${STARTER_PORTS[mode]}${route}`);
  await page.evaluate(() => document.fonts.ready);
  return problems;
}

for (const mode of MODES) {
  for (const width of WIDTHS) {
    test.describe(`${mode} at ${width}px`, () => {
      test.use({ viewport: { width, height: width >= 1000 ? 900 : 844 }, deviceScaleFactor: 1 });

      for (const route of ["/", `/articles/${{ corporate: "launch-notes", magazine: "parking-tickets", leadgen: "case-paper-mile" }[mode]}/`]) {
        test(`${route}: no sideways scroll, one h1, nothing past the edge, nothing blocked by the policy`, async ({ page }) => {
          const problems = await open(page, mode, route);
          await expect(page.locator("h1")).toHaveCount(1);
          const overflow = await page.evaluate(() => {
            const root = document.documentElement;
            const wide: string[] = [];
            for (const element of document.body.querySelectorAll<HTMLElement>("*")) {
              const box = element.getBoundingClientRect();
              if (box.width > 0 && (box.right > root.clientWidth + 1 || box.left < -1)) wide.push(`${element.tagName.toLowerCase()}.${element.className}`);
            }
            return { scroll: root.scrollWidth, client: root.clientWidth, wide: wide.slice(0, 8) };
          });
          expect(overflow.scroll, `page is ${overflow.scroll}px wide in a ${overflow.client}px window`).toBeLessThanOrEqual(overflow.client);
          expect(overflow.wide, "elements past the viewport edge").toEqual([]);
          expect(problems).toEqual([]);
          const images = await page.evaluate(() => [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
          expect(images).toEqual([]);
        });
      }

      test("buttons and links are big enough to tap on a phone", async ({ page }) => {
        test.skip(width > 400, "touch targets matter on phones");
        await open(page, mode, "/");
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".btn, .mast-nav a, .mark")]
            .map((element) => ({ text: element.textContent?.trim().slice(0, 30), box: element.getBoundingClientRect() }))
            .filter((entry) => entry.box.height > 0 && entry.box.height < 40)
            .map((entry) => `${entry.text} ${Math.round(entry.box.height)}px`),
        );
        expect(small).toEqual([]);
      });

      if (width === 390 || width === 1280) {
        test("screenshot", async ({ page }) => {
          await open(page, mode, "/");
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.screenshot({ path: path.join(SHOTS, `phase4-${mode}-${width === 390 ? "mobile-390" : "desktop-1280"}.png`), fullPage: true });
        });
      }
    });
  }
}
