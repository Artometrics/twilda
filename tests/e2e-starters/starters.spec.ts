import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { siteCsp } from "@twilda/core";
import { readSiteFile } from "@twilda/core/node";
import { STARTER_PORTS } from "../../playwright.starters.config";

const MODES = ["corporate", "magazine", "leadgen"] as const;
const WIDTHS = [320, 390, 1280] as const;
const SHOTS = path.resolve("docs/screenshots");

/**
 * What the page may do: the policy the site would be served with, built from its own settings. A starter
 * with no form gets the locked policy (no script, no form post, no network); one with a form gets that
 * opened to its one form address and nothing else.
 */
const siteOf = (mode: (typeof MODES)[number]) => readSiteFile(path.resolve("examples", `starter-${mode}`, "content"));
const CSP: Record<(typeof MODES)[number], string> = { corporate: siteCsp(siteOf("corporate")), magazine: siteCsp(siteOf("magazine")), leadgen: siteCsp(siteOf("leadgen")) };

const FORM_ID: Record<(typeof MODES)[number], string | null> = { corporate: "enquiry", magazine: null, leadgen: "join" };
const ENDPOINT = "https://forms.example.com/replace-with-your-form-address";
const SENT: Record<(typeof MODES)[number], string> = { corporate: "Message sent", magazine: "", leadgen: "Request received" };

async function open(page: Page, mode: (typeof MODES)[number], route: string): Promise<string[]> {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  await page.route("**/*", async (request) => {
    const response = await request.fetch();
    await request.fulfill({ response, headers: { ...response.headers(), "content-security-policy": CSP[mode] } });
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

      if (FORM_ID[mode]) formTests(mode, width);
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Phase 5: the form, under the production policy, at each width.

/** Freeze the clock the form's time trap reads, so the test decides how long the visitor "took". */
async function freezeClock(page: Page) {
  await page.addInitScript(() => {
    let now = 1_000_000;
    Date.now = () => now;
    (window as unknown as { __tick: (ms: number) => void }).__tick = (ms) => {
      now += ms;
    };
  });
}
const tick = (page: Page, ms: number) => page.evaluate((value) => (window as unknown as { __tick: (ms: number) => void }).__tick(value), ms);

async function recordPosts(page: Page, respond: { status: number; body?: string } = { status: 200 }) {
  const posts: Array<{ method: string; headers: Record<string, string>; body: string }> = [];
  await page.route(`${ENDPOINT}**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
    posts.push({ method: request.method(), headers: request.headers(), body: request.postData() ?? "" });
    return route.fulfill({ status: respond.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: respond.body ?? '{"ok":true}' });
  });
  return posts;
}

async function fillForm(page: Page, id: string) {
  const form = page.locator(`#${id} form`);
  await form.locator("[name=name]").fill("Ada Lovelace");
  await form.locator("[name=email]").fill("ada@example.com");
  if ((await form.locator("[name=message]").count()) > 0) await form.locator("[name=message]").fill("Hello, I would like a call.");
  if ((await form.locator("[name=company]").count()) > 0) await form.locator("[name=company]").fill("Analytical Engines");
}

function formTests(mode: (typeof MODES)[number], width: number) {
  const id = FORM_ID[mode] as string;
  test.describe(`${mode} form at ${width}px`, () => {
    test("is a big, labelled, one-column form that fits the window, with the policy in force", async ({ page }) => {
      const problems = await open(page, mode, "/");
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await expect(section.locator("form[method=post]")).toHaveAttribute("action", ENDPOINT);
      await expect(section.locator("form")).toHaveAttribute("data-tf", "");
      const report = await section.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const fields = [...node.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([name=_hp]), textarea, button.form-submit")];
        return {
          fits: box.right <= document.documentElement.clientWidth + 1 && box.left >= -1,
          small: fields.filter((field) => field.getBoundingClientRect().height < 44).map((field) => field.getAttribute("name") ?? field.className),
          unlabelled: fields.filter((field) => field.tagName !== "BUTTON" && !(field as HTMLInputElement).labels?.length).map((field) => field.getAttribute("name")),
          narrow: fields.filter((field) => field.getBoundingClientRect().width < Math.min(220, document.documentElement.clientWidth - 90)).map((field) => field.getAttribute("name")),
          trapVisible: (() => {
            const trap = node.querySelector<HTMLElement>(".form-trap");
            const rect = trap?.getBoundingClientRect();
            return !!trap && !!rect && (getComputedStyle(trap).opacity !== "0" || rect.width > 1 || rect.height > 1);
          })(),
        };
      });
      expect(report.fits).toBe(true);
      expect(report.small, "controls under 44px tall").toEqual([]);
      expect(report.unlabelled).toEqual([]);
      expect(report.narrow).toEqual([]);
      expect(report.trapVisible, "the honeypot is invisible and one pixel").toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(problems).toEqual([]);
      fs.mkdirSync(SHOTS, { recursive: true });
      await section.screenshot({ path: path.join(SHOTS, `phase5-form-${mode}-${width}.png`) });
    });

    test("an empty submit shows an error beside each field, marks it invalid, moves focus, and sends nothing", async ({ page }) => {
      await freezeClock(page);
      const problems = await open(page, mode, "/");
      const posts = await recordPosts(page);
      const form = page.locator(`#${id} form`);
      await form.locator("button.form-submit").click();
      await expect(form.locator("[name=name]")).toHaveAttribute("aria-invalid", "true");
      await expect(form.locator("[name=name]")).toBeFocused();
      const email = form.locator("[name=email]");
      await expect(email).toHaveAttribute("aria-invalid", "true");
      const errorId = ((await email.getAttribute("aria-describedby")) ?? "").split(" ").find((value) => value.endsWith("-err")) as string;
      await expect(page.locator(`#${errorId}`)).toBeVisible();
      await expect(page.locator(`#${errorId}`)).toHaveText(/required/i);
      await expect(page.locator(`#${id} .form-summary`)).toBeVisible();
      await expect(page.locator(`#${id} .form-summary`)).toHaveAttribute("role", "alert");
      await form.locator("[name=name]").fill("Ada");
      await expect(form.locator("[name=name]")).not.toHaveAttribute("aria-invalid", "true");
      await form.locator("[name=email]").fill("ada@example.com, x@y.com");
      await form.locator("button.form-submit").click();
      await expect(email).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator(`#${errorId}`)).toHaveText(/email address/i);
      expect(posts).toEqual([]);
      expect(problems).toEqual([]);
      if (width === 390) await page.locator(`#${id}`).screenshot({ path: path.join(SHOTS, `phase5-form-${mode}-errors-390.png`) });
    });

    test("a too-fast submit is asked to press again, then sends; a person is never dropped silently", async ({ page }) => {
      await freezeClock(page);
      await open(page, mode, "/");
      const posts = await recordPosts(page);
      await fillForm(page, id);
      await page.locator(`#${id} button.form-submit`).click();
      await expect(page.locator(`#${id} .form-summary`)).toContainText("press the button again");
      expect(posts).toEqual([]);
      await tick(page, 2000);
      await page.locator(`#${id} button.form-submit`).click();
      await expect(page.locator(`#${id} .form-success`)).toBeVisible();
      expect(posts).toHaveLength(1);
    });

    test("a good submit posts once to the one address, shows the success on the page, and moves focus to it", async ({ page }) => {
      await freezeClock(page);
      const problems = await open(page, mode, "/");
      const posts = await recordPosts(page);
      await fillForm(page, id);
      await tick(page, 5000);
      await page.locator(`#${id} button.form-submit`).click();
      const success = page.locator(`#${id} .form-success`);
      await expect(success).toBeVisible();
      await expect(success).toBeFocused();
      await expect(success).toContainText(SENT[mode]);
      await expect(page.locator(`#${id} form`)).toBeHidden();
      expect(posts).toHaveLength(1);
      const post = posts[0] as (typeof posts)[number];
      expect(post.method).toBe("POST");
      expect(post.headers["content-type"]).toContain("application/x-www-form-urlencoded");
      expect(post.headers["accept"]).toContain("application/json");
      expect(post.headers["cookie"]).toBeUndefined();
      const body = new URLSearchParams(post.body);
      expect(body.get("name")).toBe("Ada Lovelace");
      expect(body.get("email")).toBe("ada@example.com");
      expect(body.get("_form")).toBe(id);
      expect(body.get("_page")).toBe("/");
      expect(Number(body.get("_elapsed_ms"))).toBeGreaterThanOrEqual(5000);
      expect(body.has("_hp")).toBe(false);
      expect(problems).toEqual([]);
      if (width === 390) await page.locator(`#${id}`).screenshot({ path: path.join(SHOTS, `phase5-form-${mode}-success-390.png`) });
    });

    test("a filled honeypot gets a believable success and nothing is sent", async ({ page }) => {
      await freezeClock(page);
      await open(page, mode, "/");
      const posts = await recordPosts(page);
      await fillForm(page, id);
      await page.locator(`#${id} [name=_hp]`).evaluate((input: HTMLInputElement) => {
        input.value = "https://spam.example";
      });
      await tick(page, 5000);
      await page.locator(`#${id} button.form-submit`).click();
      await expect(page.locator(`#${id} .form-success`)).toBeVisible();
      expect(posts).toEqual([]);
    });

    test("a failed send says so, keeps what was typed, and can be retried", async ({ page }) => {
      await freezeClock(page);
      await open(page, mode, "/");
      let status = 500;
      const posts: string[] = [];
      await page.route(`${ENDPOINT}**`, (route) => {
        posts.push(route.request().method());
        return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "{}" });
      });
      await fillForm(page, id);
      await tick(page, 5000);
      const button = page.locator(`#${id} button.form-submit`);
      await button.click();
      const failure = page.locator(`#${id} .form-failure`);
      await expect(failure).toBeVisible();
      await expect(failure).toHaveAttribute("role", "alert");
      await expect(page.locator(`#${id} [name=email]`)).toHaveValue("ada@example.com");
      await expect(button).toBeEnabled();
      status = 200;
      await button.click();
      await expect(page.locator(`#${id} .form-success`)).toBeVisible();
      await expect(failure).toBeHidden();
      expect(posts.filter((method) => method === "POST")).toHaveLength(2);
    });

    test("the policy lets the form reach its own address and nowhere else", async ({ page }) => {
      const problems = await open(page, mode, "/");
      const outcomes = await page.evaluate(async (endpoint) => {
        const attempt = (url: string) => fetch(url, { method: "POST", body: "x", mode: "no-cors", credentials: "omit" }).then(() => "sent", () => "blocked");
        return { other: await attempt("https://evil.example/collect"), sameSite: await attempt("/collect"), http: await attempt(endpoint.replace("https:", "http:")) };
      }, ENDPOINT);
      expect(outcomes.other).toBe("blocked");
      expect(outcomes.sameSite).toBe("blocked");
      expect(outcomes.http).toBe("blocked");
      expect(problems.some((message) => /Content Security Policy/i.test(message) && /evil\.example/.test(message))).toBe(true);
      expect(CSP[mode]).toContain("form-action https://forms.example.com;");
    });
  });
}

for (const mode of ["corporate", "leadgen"] as const) {
  test.describe(`${mode} form with JavaScript off`, () => {
    test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

    test("is a plain form post: required fields, then a normal POST to the one address", async ({ page }) => {
      const id = FORM_ID[mode] as string;
      await page.route("**/*", async (route) => {
        const url = route.request().url();
        if (url.startsWith(ENDPOINT)) return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Thanks</title><p>Thank you from the service.</p>" });
        const response = await route.fetch();
        return route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": CSP[mode] } });
      });
      await page.goto(`http://127.0.0.1:${STARTER_PORTS[mode]}/`);
      const form = page.locator(`#${id} form`);
      await expect(form).toHaveAttribute("method", "post");
      await expect(form).toHaveAttribute("action", ENDPOINT);
      await expect(page.locator(`#${id} .form-success`)).toBeHidden();
      await expect(form.locator("[name=email]")).toHaveAttribute("required", "");
      await fillForm(page, id);
      const request = page.waitForRequest((candidate) => candidate.url().startsWith(ENDPOINT));
      await form.locator("button.form-submit").click();
      const sent = await request;
      expect(sent.method()).toBe("POST");
      const body = new URLSearchParams(sent.postData() ?? "");
      expect(body.get("email")).toBe("ada@example.com");
      expect(body.get("_hp")).toBe("");
      expect(body.get("_form")).toBe(id);
      await expect(page.locator("p")).toHaveText("Thank you from the service.");
    });

    test("without script, the page still shows the form legibly (no sideways scroll)", async ({ page }) => {
      await page.goto(`http://127.0.0.1:${STARTER_PORTS[mode]}/`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  });
}
