import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_THEME, THEME_FONTS, defaultSite, parseSite, serializeSite, siteSchema, themeCss, themeSchema, themeVars, type Theme } from "@twilda/core";

const INJECTIONS = [
  "red;}</style><script>alert(1)</script>",
  "#fff;background:url(https://evil.example/x)",
  "#ffffff} body{display:none}",
  "#ffffff;--x:1",
  "expression(alert(1))",
  "url(javascript:alert(1))",
  "#fff\n;color:red",
  "#ffffff /* */",
  " #ffffff",
  "#ffffff ",
  "#FFFFFFF",
  "#ffff",
  "rgb(0,0,0)",
  "red",
  "\\0023ffffff",
  "#gggggg",
  "var(--x)",
  "@import url(//evil.example/x.css)",
  "",
];

const base = (): Theme => structuredClone(DEFAULT_THEME);

test("theme colors accept only six-digit hex; every injection is refused by the schema", () => {
  for (const key of Object.keys(DEFAULT_THEME.colors) as Array<keyof Theme["colors"]>) {
    for (const bad of INJECTIONS) {
      const theme = base();
      theme.colors[key] = bad;
      assert.equal(themeSchema.safeParse(theme).success, false, `${key}: ${JSON.stringify(bad)}`);
    }
  }
});

test("theme fonts are a closed list: free text and CSS cannot be a font", () => {
  for (const bad of ["Arial", "serif; background:red", "'x'}</style>", "url(x)", "constructor", "__proto__", "toString", "newsreader ", "NEWSREADER"]) {
    for (const slot of ["heading", "body"] as const) {
      const theme = base();
      (theme.fonts as Record<string, string>)[slot] = bad;
      assert.equal(themeSchema.safeParse(theme).success, false, `${slot}: ${bad}`);
    }
  }
});

test("numbers are bounded and stepped: NaN, Infinity, huge, negative, strings", () => {
  for (const [key, bads] of Object.entries({
    baseSize: [Number.NaN, Infinity, -Infinity, 0, -17, 14, 22, 17.3, 1e9, "17", "17;color:red", null],
    headingScale: [Number.NaN, Infinity, 0, -1, 0.5, 1.31, 1.01, 1e9, "1"],
    spacing: [Number.NaN, Infinity, 0, -1, 0.5, 1.7, 1.01, 1e9, "1"],
  })) {
    for (const bad of bads) {
      const theme = base() as unknown as Record<string, unknown>;
      theme[key] = bad;
      assert.equal(themeSchema.safeParse(theme).success, false, `${key}: ${String(bad)}`);
    }
  }
});

test("unknown theme keys are dropped, never copied into a stylesheet", () => {
  const theme = { ...base(), "--evil": "1", extra: "x;}", colors: { ...base().colors, evil: "#000000" } };
  const parsed = themeSchema.parse(theme);
  assert.deepEqual(Object.keys(parsed).sort(), ["baseSize", "colors", "fonts", "headingScale", "spacing"]);
  assert.ok(!("evil" in parsed.colors));
});

test("generated stylesheet contains only the closed property set and legal values", () => {
  const theme = base();
  theme.colors.paper = "#ABCDEF";
  theme.fonts.heading = "georgia";
  theme.baseSize = 18.5;
  theme.headingScale = 1.15;
  theme.spacing = 1.2;
  const css = themeCss(theme);
  assert.ok(css.length > 0);
  assert.ok(!/[<>@\\]|url\(|expression|javascript|import/i.test(css), css);
  const properties = [...css.matchAll(/(--[a-z-]+|background):/g)].map((match) => match[1]);
  for (const property of properties) {
    assert.ok(
      ["--site-paper", "--site-ink", "--site-muted", "--site-hair", "--site-kicker", "--site-plate", "--site-font-heading", "--site-font-body", "--site-base", "--site-heading-scale", "--site-space", "background"].includes(property as string),
      `unexpected property ${property}`,
    );
  }
  assert.equal(css.split("{").length - 1, css.split("}").length - 1, "braces balance");
  assert.equal(themeCss(DEFAULT_THEME), "");
});

test("themeVars survives hostile runtime values by falling back, never by emitting them", () => {
  for (const bad of INJECTIONS) {
    const theme = base();
    theme.colors.ink = bad;
    theme.colors.kicker = "#123456";
    const vars = themeVars(theme);
    assert.match(vars["--site-ink"] as string, /^#[0-9a-f]{6}$/);
    assert.equal(vars["--site-kicker"], "#123456");
    for (const value of Object.values(vars)) assert.ok(!/[<>;{}]|url\(|expression/i.test(value.replace(/"[^"]*"/g, "")), value);
  }
  const garbage = themeVars({ colors: null, fonts: 7, baseSize: "x" } as unknown as Theme);
  assert.deepEqual(garbage, themeVars(DEFAULT_THEME));
  assert.throws(() => themeCss({ ...base(), colors: { ...base().colors, paper: "red;}</style>" } }));
});

test("every font stack is built only from names, quotes, and commas", () => {
  for (const [id, font] of Object.entries(THEME_FONTS)) {
    assert.match(font.stack, /^[A-Za-z0-9 ",'\-]+$/, id);
  }
});

test("site.json cannot smuggle theme or chrome keys through the prototype", () => {
  const text = serializeSite(defaultSite());
  const poisoned = text.replace('"theme": {', '"__proto__": {"polluted": true}, "theme": {');
  const parsed = parseSite(poisoned);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal((parsed as unknown as Record<string, unknown>).polluted, undefined);
  assert.equal(siteSchema.safeParse(JSON.parse('{"version":1,"documents":{"__proto__":{"name":"x"}}}')).success, false);
});
