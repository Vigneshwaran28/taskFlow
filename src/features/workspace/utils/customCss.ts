// Tenant custom CSS: the client-side mirror of the server's sanitizer
// (server/src/services/moduleSettings.js customCssProblem — keep the two lists in step), the hook selectors
// tenant CSS may target, and "safe mode" (?nocss=1) for recovering from broken CSS.

export const CUSTOM_CSS_MAX = 20_000;

/** [pattern, why]: checked on the CSS as written and again with comments removed. */
const CSS_FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/url\s*\(/i, "url() isn't allowed: it can load remote files or leak what people type."],
  [/image-set\s*\(/i, "image-set() isn't allowed: it can load remote files."],
  [/(^|[^\w-])src\s*\(/i, "src() isn't allowed: it can load remote files."],
  [/@import/i, "@import isn't allowed."],
  [/@charset/i, "@charset isn't allowed."],
  [/@namespace/i, "@namespace isn't allowed."],
  [/@font-face/i, "@font-face isn't allowed (it loads font files)."],
  [/expression\s*\(/i, "expression() isn't allowed."],
  [/behavior\s*:/i, "behavior: isn't allowed."],
  [/-moz-binding/i, "-moz-binding isn't allowed."],
  [/javascript\s*:/i, "javascript: isn't allowed."],
  [/<\/style/i, "</style isn't allowed."],
  [/<script/i, "<script isn't allowed."],
  [/\\/, "Backslash escapes aren't allowed (they can hide blocked words)."],
  [/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/, "Remove the invisible control characters."],
];

/** Plain-language list of the rules, for the editor. */
export const CUSTOM_CSS_RULES = [
  "url(), image-set() and src() (no remote files)",
  "@import, @charset, @namespace, @font-face",
  "expression(), behavior:, -moz-binding, javascript:",
  "</style and <script",
  "backslash escapes",
] as const;

/** Line endings as \n (CRLF and lone CR), as the server stores them. */
export const normalizeCss = (css: string | null | undefined) => String(css ?? "").replace(/\r\n?/g, "\n");

/** Why this CSS can't be saved, or null when it's fine. */
export function customCssProblem(css: string | null | undefined): string | null {
  const text = normalizeCss(css);
  if (text.length > CUSTOM_CSS_MAX) return `Keep custom CSS under ${CUSTOM_CSS_MAX.toLocaleString("en-US")} characters.`;
  const withoutComments = text.replace(/\/\*[\s\S]*?(\*\/|$)/g, "");
  for (const [pattern, why] of CSS_FORBIDDEN) {
    if (pattern.test(text) || pattern.test(withoutComments)) return why;
  }
  return null;
}

/** Stable hooks on key elements (data-tf="…") for tenant CSS to target. */
export const CSS_HOOKS = [
  { selector: '[data-tf="login-page"]', where: "Sign-in page", what: "The whole page (also has data-tf-template=\"split|centered|…\")" },
  { selector: '[data-tf="login-card"]', where: "Sign-in page", what: "The area holding the sign-in form" },
  { selector: '[data-tf="login-brand"]', where: "Sign-in page", what: "The workspace mark and title" },
  { selector: '[data-tf="sidebar"]', where: "App", what: "The navigation sidebar" },
  { selector: '[data-tf="topbar"]', where: "App", what: "The bar across the top" },
  { selector: '[data-tf="page"]', where: "App", what: "The main page area" },
] as const;

export const EXAMPLE_LOGIN_CSS = `/* Sign-in page */
[data-tf="login-card"] {
  border-radius: 1.25rem;
  box-shadow: 0 20px 45px -20px rgb(15 23 42 / 0.45);
}

[data-tf="login-brand"] {
  letter-spacing: -0.02em;
}

[data-tf="login-page"] h1 {
  font-weight: 700;
}
`;

export const EXAMPLE_APP_CSS = `/* Signed-in app */
[data-tf="sidebar"] {
  border-right-width: 2px;
}

[data-tf="topbar"] {
  box-shadow: 0 1px 0 rgb(15 23 42 / 0.06);
}

[data-tf="page"] h1 {
  letter-spacing: -0.01em;
}
`;

const SAFE_MODE_KEY = "tf-nocss";

/**
 * Safe mode: `?nocss=1` on any workspace page skips tenant CSS for this browser tab (until `?nocss=0`), so an
 * admin can get back to Settings → Branding and fix CSS that broke the page.
 */
export function isCustomCssSafeMode(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("nocss");
  try {
    if (param === "1") window.sessionStorage.setItem(SAFE_MODE_KEY, "1");
    else if (param === "0") window.sessionStorage.removeItem(SAFE_MODE_KEY);
    return param === "1" || window.sessionStorage.getItem(SAFE_MODE_KEY) === "1";
  } catch {
    return param === "1";
  }
}

/** Count of lines in a block (for the editor's line count). */
export const lineCount = (css: string) => (css ? normalizeCss(css).split("\n").length : 0);

// ---- Personal CSS (Settings → Appearance → My custom CSS): the same rules, a smaller limit, applied after the
// workspace's CSS so it wins. Server: routes/auth.js preferencesSchema.customCss, services/moduleSettings.js userCssProblem.

export const USER_CSS_MAX = 10_000;

/** Why this personal CSS can't be saved, or null when it's fine. */
export function userCssProblem(css: string | null | undefined): string | null {
  const text = normalizeCss(css);
  if (text.length > USER_CSS_MAX) return `Keep your CSS under ${USER_CSS_MAX.toLocaleString("en-US")} characters.`;
  return customCssProblem(text);
}

/** True when `{` and `}` pair up (comments and quoted strings ignored), so a half-typed rule isn't applied. */
export function bracesBalanced(css: string) {
  let depth = 0;
  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (char === "/" && css[index + 1] === "*") {
      const end = css.indexOf("*/", index + 2);
      if (end === -1) return false;
      index = end + 1;
    } else if (char === '"' || char === "'") {
      const end = css.indexOf(char, index + 1);
      if (end === -1) return false;
      index = end;
    } else if (char === "{") depth += 1;
    else if (char === "}" && --depth < 0) return false;
  }
  return depth === 0;
}

/**
 * Design tokens (CSS variables) every page reads. Set them on `html[data-style][data-accent]` (TOKEN_SELECTOR) so they
 * beat the style presets and accent colours in light and dark mode alike.
 */
export const TOKEN_SELECTOR = "html[data-style][data-accent]";
export const CSS_VARIABLES = [
  { name: "--color-primary", what: "Buttons, links, and highlights (also --color-ring for focus rings)" },
  { name: "--color-background", what: "Page colour (and --color-foreground for text)" },
  { name: "--color-card", what: "Cards, panels, the sidebar, and dialogs" },
  { name: "--color-muted", what: "Subtle fills (and --color-muted-foreground for secondary text)" },
  { name: "--color-border", what: "Borders and dividers" },
  { name: "--radius-lg / --radius-xl", what: "Corner rounding of buttons and fields / cards (also -sm, -md, -2xl)" },
  { name: "--shadow-1 / --shadow-2", what: "Small and large shadows (any style but Classic)" },
  { name: "--font-sans", what: "The UI typeface stack (system fonts only: font files can't be loaded)" },
  { name: "--spacing", what: "The spacing unit every gap and padding is a multiple of (0.25rem; compact density uses 0.21rem)" },
  { name: "--heading-weight", what: "Weight of page and card headings" },
] as const;

/** Ready-made starting points for personal CSS. */
export const USER_CSS_SNIPPETS = [
  { label: "Rounder cards", css: `/* Rounder cards and buttons */\n${TOKEN_SELECTOR} {\n  --radius-lg: 0.75rem;\n  --radius-xl: 1.25rem;\n}\n` },
  { label: "Compact sidebar", css: `/* Compact sidebar */\n[data-tf="sidebar"] a {\n  padding-block: 0.3rem;\n  font-size: 0.8125rem;\n}\n` },
  { label: "Larger headings", css: `/* Larger page headings */\n[data-tf="page"] h1 {\n  font-size: 1.875rem;\n  letter-spacing: -0.02em;\n}\n` },
  { label: "Custom colours", css: `/* My own colours */\n${TOKEN_SELECTOR} {\n  --color-primary: #0f766e;\n  --color-ring: #14b8a6;\n}\n` },
  { label: "Softer shadows", css: `/* Softer shadows */\n${TOKEN_SELECTOR} {\n  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.05);\n  --shadow-2: 0 12px 24px -12px rgb(0 0 0 / 0.25);\n}\n` },
  { label: "Roomier spacing", css: `/* A little more room everywhere */\n${TOKEN_SELECTOR} {\n  --spacing: 0.27rem;\n}\n` },
] as const;
