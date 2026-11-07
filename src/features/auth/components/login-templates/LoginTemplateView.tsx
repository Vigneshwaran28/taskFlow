"use client";
// A workspace's sign-in page, in one of five layouts. Responsive by container width (Tailwind @container
// variants), so the same markup works on a 360 px phone, a desktop, and as a scaled-down preview card.
import { LogoGlyph } from "@/components/shared/logoIcons";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { CheckCircle2, LifeBuoy, Lock, ShieldCheck } from "lucide-react";
import { MODULES } from "@/app-shell/modules";
import { useTheme, type Accent } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import type { LoginTemplate } from "@/types/session";
import { ACCENT_PRIMARY, LOGIN_BACKGROUNDS, LOGIN_LIMITS, type LoginTemplateWorkspace } from "./loginTemplateMeta";
import { InteractiveCharacters, InteractiveShapesPanel } from "./InteractiveCharacters";

type IconType = ComponentType<{ className?: string }>;

interface Tone {
  text: string;
  soft: string;
  chip: string;
  mark: string;
  link: string;
  active: string;
}

/** Text on the coloured gradients: white, with translucent chips. */
const ON_GRADIENT: Tone = {
  text: "text-white",
  soft: "text-white/85",
  chip: "bg-white/10 text-white ring-1 ring-inset ring-white/20",
  mark: "bg-white text-slate-900 shadow-sm",
  link: "font-medium text-white underline underline-offset-2",
  active: "bg-white/15 font-medium text-white",
};

/** Text on theme surfaces (plain background, cards, the form side). */
const ON_SURFACE: Tone = {
  text: "text-foreground",
  soft: "text-muted-foreground",
  chip: "bg-card text-foreground ring-1 ring-inset ring-border",
  mark: "bg-primary text-primary-foreground shadow-sm",
  link: "font-medium text-primary underline-offset-2 hover:underline",
  active: "bg-primary/10 font-medium text-primary",
};

const EMAIL = /^\S+@\S+\.\S+$/;
const YEAR = new Date().getFullYear();

interface Resolved {
  siteTitle: string;
  tagline: string;
  headline: string;
  message: string;
  highlights: { text: string; icon: IconType }[];
  supportContact: string;
  companyName: string;
  initial: string;
  /** The workspace's logo (an image link, or an icon other than the default tick); else the title's initial */
  logo: { icon?: string | null; url?: string | null };
  background: string;
  /** Tone for text placed directly on the background */
  tone: Tone;
  /** Above the form (the sign-in page's own words; other pages such as the password reset pass theirs) */
  formTitle: string;
  formSubtitle: string;
  /** "Sign in to continue" on the banner template */
  formTitleShort: string;
  imageUrl: string;
}

const SAFE_IMAGE = /^https?:\/\/[^\s"'()<>\\]+$/i;
const DEFAULT_SCENIC_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_GLASS_IMAGE = "https://images.wallpapersden.com/image/download/firewatch-new-hd-22-art_bWpubm2UmZqaraWkpJRnamtlrWZpaWU.jpg";

function resolve(workspace: LoginTemplateWorkspace): Resolved {
  const { login } = workspace;
  const siteTitle = workspace.siteTitle.trim() || "TaskFlow";
  const custom = login.highlights.map(item => item.trim()).filter(Boolean);
  const highlights = custom.length
    ? custom.map(text => ({ text, icon: CheckCircle2 as IconType }))
    : workspace.features.flatMap(key => (MODULES[key] ? [{ text: MODULES[key].label, icon: MODULES[key].icon }] : []));
  const plain = login.background === "plain";
  const imageUrl = login.loginImageUrl?.trim() || (login.template === "glass" ? DEFAULT_GLASS_IMAGE : DEFAULT_SCENIC_IMAGE);
  return {
    siteTitle,
    tagline: workspace.tagline.trim(),
    headline: login.headline.trim() || `Sign in to ${siteTitle}`,
    message: login.message.trim(),
    highlights: highlights.slice(0, custom.length ? LOGIN_LIMITS.highlights : 6),
    supportContact: login.supportContact.trim(),
    companyName: workspace.companyName.trim() || siteTitle,
    initial: Array.from(siteTitle)[0]?.toUpperCase() ?? "T",
    logo: { icon: workspace.logoIcon, url: workspace.logoUrl },
    background: LOGIN_BACKGROUNDS[login.background] ?? LOGIN_BACKGROUNDS.indigo,
    tone: plain ? ON_SURFACE : ON_GRADIENT,
    formTitle: "Welcome back",
    formSubtitle: `Sign in with your ${siteTitle} account.`,
    formTitleShort: "Sign in to continue",
    imageUrl,
  };
}

/* ---------- Building blocks ---------- */

function Mark({ initial, logo, tone, small = false }: { initial: string; logo?: Resolved["logo"]; tone: Tone; small?: boolean }) {
  const size = small ? "h-8 w-8" : "h-10 w-10";
  if (logo?.url && SAFE_IMAGE.test(logo.url)) {
    // eslint-disable-next-line @next/next/no-img-element -- a workspace's own image link on any host
    return <img src={logo.url} alt="" className={cn("shrink-0 rounded-xl bg-white object-contain", size)} referrerPolicy="no-referrer" />;
  }
  const custom = Boolean(logo?.icon && logo.icon !== "check");
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-xl font-semibold", size, small ? "text-sm" : "text-base", tone.mark)}>
      {custom ? <LogoGlyph name={logo?.icon} className={small ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.25} /> : initial}
    </span>
  );
}

function Brand({ title, subtitle, initial, logo, tone, small = false }: { title: string; subtitle?: string; initial: string; logo?: Resolved["logo"]; tone: Tone; small?: boolean }) {
  return (
    <div data-tf="login-brand" className="flex min-w-0 items-center gap-3">
      <Mark initial={initial} logo={logo} tone={tone} small={small} />
      <div className="min-w-0">
        <p className={cn("truncate font-semibold tracking-tight", small ? "text-sm" : "text-base", tone.text)}>{title}</p>
        {subtitle && <p className={cn("truncate text-xs", tone.soft)}>{subtitle}</p>}
      </div>
    </div>
  );
}

function HighlightList({ items, tone, className }: { items: Resolved["highlights"]; tone: Tone; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cn("flex-col gap-3.5", className)}>
      {items.map(({ text, icon: Icon }, index) => (
        <li key={index} className={cn("flex items-center gap-3 text-sm", tone.soft)}>
          <span className={cn("shrink-0 rounded-lg p-2", tone.chip)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 wrap-break-word">{text}</span>
        </li>
      ))}
    </ul>
  );
}

function HighlightChips({ items, tone, className }: { items: Resolved["highlights"]; tone: Tone; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map(({ text, icon: Icon }, index) => (
        <li key={index} className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", tone.chip)}>
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{text}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Need help signing in?" with the workspace's support contact (an email becomes a mail link). */
function Support({ contact, tone, className, fallback }: { contact: string; tone: Tone; className?: string; fallback?: string }) {
  if (!contact && !fallback) return null;
  return (
    <p className={cn("text-sm", tone.soft, className)}>
      {contact ? (
        <>
          Need help signing in?{" "}
          {EMAIL.test(contact) ? (
            <a href={`mailto:${contact}`} className={cn("break-all", tone.link)}>
              {contact}
            </a>
          ) : (
            <span className={cn("font-medium", tone.text)}>{contact}</span>
          )}
        </>
      ) : (
        fallback
      )}
    </p>
  );
}

/** Soft light shapes that give the gradients depth (decorative). */
function Glow({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
    </div>
  );
}

const NO_ACCOUNT = "Accounts are created by your workspace administrator.";

/* ---------- Templates ---------- */

interface TemplateProps {
  r: Resolved;
  form: ReactNode;
}

/** Design 1: Fun Interactive Characters tracking cursor and reacting to credentials */
function InteractiveTemplate({ r, form }: TemplateProps) {
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const handleFocusCapture = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT") {
      const input = target as HTMLInputElement;
      const isPwd =
        input.type === "password" ||
        input.dataset.passwordField === "true" ||
        input.name === "password" ||
        input.name === "currentPassword" ||
        input.name === "newPassword" ||
        input.id?.toLowerCase().includes("password");
      if (isPwd) {
        setIsPasswordFocused(true);
        setIsInputFocused(false);
      } else {
        setIsPasswordFocused(false);
        setIsInputFocused(true);
      }
    }
  };

  const handleBlurCapture = () => {
    setIsPasswordFocused(false);
    setIsInputFocused(false);
  };

  const handleInputCapture = () => {
    setIsTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setIsTyping(false), 250);
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center min-h-screen px-4 py-8 bg-[#f7ede2] dark:bg-slate-950 overflow-hidden">
      {/* Decorative Pastel Background Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#ffafcc]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#a2d2ff]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[440px] flex flex-col items-center">
        {/* Animated Characters Header */}
        <InteractiveCharacters
          isPasswordFocused={isPasswordFocused}
          isInputFocused={isInputFocused}
          isTyping={isTyping}
        />

        {/* Card */}
        <div
          data-tf="login-card"
          onFocusCapture={handleFocusCapture}
          onBlurCapture={handleBlurCapture}
          onInputCapture={handleInputCapture}
          className="relative w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 sm:p-9 shadow-2xl shadow-slate-900/10 z-20"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <Mark initial={r.initial} logo={r.logo} tone={ON_SURFACE} />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
              {r.headline}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {r.message || `Sign in with your ${r.siteTitle} account.`}
            </p>
          </div>

          <div>{form}</div>

          <Support contact={r.supportContact} tone={ON_SURFACE} fallback={NO_ACCOUNT} className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400" />
        </div>
      </div>
    </div>
  );
}

/** Design 2: Playful Geometric Shapes with animated blinking and mouse tracking */
function ShapesTemplate({ r, form }: TemplateProps) {
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleFocusCapture = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT") {
      const input = target as HTMLInputElement;
      const isPwd =
        input.type === "password" ||
        input.dataset.passwordField === "true" ||
        input.name === "password" ||
        input.name === "currentPassword" ||
        input.name === "newPassword" ||
        input.id?.toLowerCase().includes("password");
      setIsPasswordFocused(isPwd);
    } else {
      setIsPasswordFocused(false);
    }
  };

  const handleBlurCapture = () => {
    setIsPasswordFocused(false);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen px-4 py-8 bg-slate-100 dark:bg-slate-950">
      <div className="w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 @3xl:grid-cols-2">
        {/* Left Side: Playful Shapes Panel */}
        <InteractiveShapesPanel isPasswordFocused={isPasswordFocused} />

        {/* Right Side: Form */}
        <div
          data-tf="login-card"
          onFocusCapture={handleFocusCapture}
          onBlurCapture={handleBlurCapture}
          className="flex flex-col justify-center p-8 sm:p-12 @3xl:p-14"
        >
          <div className="flex items-center gap-3 mb-6">
            <Mark initial={r.initial} logo={r.logo} tone={ON_SURFACE} />
            <div>
              <p className="font-bold text-lg leading-tight text-foreground">{r.siteTitle}</p>
              {r.tagline && <p className="text-xs text-muted-foreground">{r.tagline}</p>}
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">{r.headline}</h1>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
            {r.message || "Please enter your credentials to continue"}
          </p>

          <div>{form}</div>

          <Support contact={r.supportContact} tone={ON_SURFACE} fallback={NO_ACCOUNT} className="mt-6 text-xs text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

/** Design 3: Security Showcase Split with Trust Badges */
function SplitTemplate({ r, form }: TemplateProps) {
  const { tone } = r;
  return (
    <div className="grid flex-1 @3xl:grid-cols-[1fr_1.1fr] min-h-screen">
      <aside className={cn("relative overflow-hidden px-6 py-10 @3xl:flex @3xl:flex-col @3xl:justify-between @3xl:p-14", r.background, tone.text)}>
        {tone === ON_GRADIENT && <Glow />}
        <div className="relative">
          <Brand title={r.siteTitle} subtitle={r.tagline} initial={r.initial} logo={r.logo} tone={tone} />
        </div>
        <div className="relative mt-8 max-w-md @3xl:mt-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/15 text-xs font-semibold backdrop-blur mb-5">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Verified Workspace Access</span>
          </div>

          <h1 className="wrap-break-word text-3xl font-extrabold leading-tight tracking-tight @3xl:text-4xl">{r.headline}</h1>
          {r.message && <p className={cn("wrap-break-word mt-3 text-sm leading-relaxed @3xl:text-base", tone.soft)}>{r.message}</p>}
          <HighlightList items={r.highlights} tone={tone} className="mt-8 hidden @3xl:flex" />

          {/* Security Trust Badges */}
          <div className="mt-8 hidden @3xl:grid grid-cols-2 gap-3 pt-6 border-t border-white/15 text-xs">
            <div className="flex items-center gap-2 text-white/90">
              <Lock className="h-3.5 w-3.5" />
              <span>TLS 1.3 In-Transit</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Isolated Architecture</span>
            </div>
          </div>
        </div>
        <p className={cn("relative hidden text-xs @3xl:block", tone.soft)}>© {YEAR} {r.companyName} · Protected by TaskFlow</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 @md:px-8">
        <div data-tf="login-card" className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{r.formTitle}</h2>
          {r.formSubtitle && <p className="mt-1 text-sm text-muted-foreground">{r.formSubtitle}</p>}
          <div className="mt-6">{form}</div>
          <Support contact={r.supportContact} tone={ON_SURFACE} fallback={NO_ACCOUNT} className="mt-6 text-center text-xs" />
        </div>
      </main>
    </div>
  );
}

/** Design 4: Showcase Split Card with customizable scenic image */
function ScenicTemplate({ r, form }: TemplateProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center min-h-screen px-4 py-8 bg-slate-100 dark:bg-slate-950">
      <div className="relative w-full max-w-5xl rounded-3xl bg-card border border-border shadow-2xl overflow-hidden grid grid-cols-1 @3xl:grid-cols-2">
        {/* Left Side: Scenic Image Showcase */}
        <div className="relative min-h-[300px] @3xl:min-h-[580px] overflow-hidden bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.imageUrl}
            alt="Workspace scenery"
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.85] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40 p-8 flex flex-col justify-between text-white">
            <div className="flex items-center gap-2">
              <Mark initial={r.initial} logo={r.logo} tone={ON_GRADIENT} small />
              <span className="font-bold tracking-wide text-sm">{r.siteTitle}</span>
            </div>
            <div>
              <h2 className="text-2xl @3xl:text-3xl font-extrabold leading-tight text-white">{r.headline}</h2>
              {r.tagline && <p className="mt-2 text-sm text-white/80">{r.tagline}</p>}
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div data-tf="login-card" className="flex flex-col justify-center p-8 sm:p-12 @3xl:p-14 bg-card">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{r.formTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{r.formSubtitle || `Sign in to access your ${r.siteTitle} workspace.`}</p>
          </div>

          <div>{form}</div>

          <Support contact={r.supportContact} tone={ON_SURFACE} fallback={NO_ACCOUNT} className="mt-6 text-xs text-muted-foreground text-center" />
        </div>
      </div>
    </div>
  );
}

/** Design 5: Frosted Glassmorphism card over customizable hero background image */
function GlassTemplate({ r, form }: TemplateProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center min-h-screen px-4 py-10 overflow-hidden bg-slate-950">
      {/* Fullscreen Hero Background Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={r.imageUrl}
        alt="Background scenery"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90"
      />
      {/* Dark Blur Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Centered Glassmorphic Card */}
      <div
        data-tf="login-card"
        className="relative w-full max-w-[440px] rounded-3xl backdrop-blur-xl bg-slate-950/60 dark:bg-slate-950/70 border border-white/20 p-8 sm:p-10 shadow-2xl text-white z-10"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <Mark initial={r.initial} logo={r.logo} tone={ON_GRADIENT} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">{r.headline}</h1>
          <p className="mt-1 text-sm text-white/80">{r.message || `Sign in to ${r.siteTitle}`}</p>
        </div>

        <div className="[&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input::placeholder]:text-white/50 [&_label]:text-white/90">
          {form}
        </div>

        <Support contact={r.supportContact} tone={ON_GRADIENT} fallback={NO_ACCOUNT} className="mt-6 text-center text-xs text-white/70" />
      </div>
    </div>
  );
}

/** One card on a full-page gradient. */
function CenteredTemplate({ r, form }: TemplateProps) {
  const { tone } = r;
  return (
    <div className={cn("relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10", r.background)}>
      {tone === ON_GRADIENT && <Glow />}
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand title={r.siteTitle} subtitle={r.tagline} initial={r.initial} logo={r.logo} tone={tone} />
        </div>
        <main data-tf="login-card" className="rounded-2xl border bg-card p-6 text-foreground shadow-2xl @sm:p-8">
          <h1 className="wrap-break-word text-center text-xl font-semibold tracking-tight @sm:text-2xl">{r.headline}</h1>
          {r.message && <p className="wrap-break-word mt-2 text-center text-sm leading-relaxed text-muted-foreground">{r.message}</p>}
          <div className="mt-6">{form}</div>
        </main>
        <HighlightChips items={r.highlights} tone={tone} className="mt-6 justify-center" />
        <Support contact={r.supportContact} tone={tone} className="mt-4 text-center" />
      </div>
    </div>
  );
}

/** Wide hero band on top, the form card below it (overlapping the band's edge). */
function BannerTemplate({ r, form }: TemplateProps) {
  const { tone } = r;
  return (
    <div className="flex flex-1 flex-col">
      <header className={cn("relative overflow-hidden px-4 pb-24 pt-6 @md:px-10 @3xl:pb-32", r.background, tone.text)}>
        {tone === ON_GRADIENT && <Glow />}
        <div className="relative mx-auto max-w-5xl">
          <Brand title={r.siteTitle} subtitle={r.tagline} initial={r.initial} logo={r.logo} tone={tone} />
        </div>
        <div className="relative mx-auto mt-8 max-w-5xl @3xl:mt-14">
          <h1 className="wrap-break-word max-w-3xl text-2xl font-semibold leading-tight tracking-tight @md:text-3xl @3xl:text-5xl">{r.headline}</h1>
          {r.message && <p className={cn("wrap-break-word mt-3 max-w-2xl text-sm leading-relaxed @3xl:text-lg", tone.soft)}>{r.message}</p>}
          <HighlightChips items={r.highlights} tone={tone} className="mt-6" />
        </div>
      </header>
      <main className="relative -mt-16 flex flex-1 justify-center px-4 pb-10 @3xl:-mt-20">
        <div data-tf="login-card" className="h-fit w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl @sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">{r.formTitleShort}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the email your administrator registered for you.</p>
          <div className="mt-6">{form}</div>
          <Support contact={r.supportContact} tone={ON_SURFACE} className="mt-6 border-t pt-4" />
        </div>
      </main>
    </div>
  );
}

/** Plain page, small logo, the form. The background preset shows only as a thin line on top. */
function MinimalTemplate({ r, form }: TemplateProps) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <div aria-hidden="true" className={cn("h-1 w-full", r.background)} />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div data-tf="login-card" className="w-full max-w-sm">
          <Brand title={r.siteTitle} initial={r.initial} logo={r.logo} tone={ON_SURFACE} small />
          <h1 className="wrap-break-word mt-8 text-2xl font-semibold tracking-tight">{r.headline}</h1>
          {r.message && <p className="wrap-break-word mt-2 text-sm leading-relaxed text-muted-foreground">{r.message}</p>}
          <div className="mt-8">{form}</div>
          <Support contact={r.supportContact} tone={ON_SURFACE} className="mt-8" />
        </div>
      </main>
    </div>
  );
}

/** Navigation-style side column (company, highlights, support), form on the right, and a footer. */
function CorporateTemplate({ r, form }: TemplateProps) {
  const { tone } = r;
  const subtitle = r.siteTitle !== r.companyName ? r.siteTitle : r.tagline;
  return (
    <div className="flex flex-1 flex-col @3xl:flex-row">
      <aside className={cn("relative flex flex-col gap-8 overflow-hidden px-5 py-5 @3xl:w-72 @3xl:shrink-0 @3xl:px-5 @3xl:py-8", r.background, tone.text)}>
        {tone === ON_GRADIENT && <Glow />}
        <div className="relative px-1">
          <Brand title={r.companyName} subtitle={subtitle} initial={Array.from(r.companyName)[0]?.toUpperCase() ?? r.initial} tone={tone} />
        </div>
        {r.highlights.length > 0 && (
          <nav aria-label="About this workspace" className="relative hidden @3xl:block">
            <p className={cn("px-3 text-[11px] font-semibold uppercase tracking-wider", tone.soft)}>Workspace</p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {r.highlights.map(({ text, icon: Icon }, index) => (
                <li key={index} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", index === 0 ? tone.active : tone.soft)}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate">{text}</span>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className={cn("relative mt-auto hidden rounded-xl p-4 @3xl:block", tone.chip)}>
          <p className="flex items-center gap-2 text-sm font-medium">
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Support
          </p>
          <p className="mt-1 break-words text-xs opacity-90">{r.supportContact || NO_ACCOUNT}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <main className="flex flex-1 items-center justify-center px-4 py-10 @3xl:px-12">
          <div className="w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{r.siteTitle}</p>
            <h1 className="wrap-break-word mt-2 text-2xl font-semibold tracking-tight @3xl:text-3xl">{r.headline}</h1>
            {r.message && <p className="wrap-break-word mt-2 text-sm leading-relaxed text-muted-foreground">{r.message}</p>}
            <div data-tf="login-card" className="mt-8 rounded-xl border bg-card p-5 shadow-sm @sm:p-6">{form}</div>
            <Support contact={r.supportContact} tone={ON_SURFACE} fallback={NO_ACCOUNT} className="mt-4 @3xl:hidden" />
          </div>
        </main>
        <footer className="flex flex-col gap-1 border-t px-4 py-4 text-xs text-muted-foreground @md:flex-row @md:items-center @md:justify-between @3xl:px-12">
          <span>
            © {YEAR} {r.companyName}
          </span>
          <span>Powered by TaskFlow</span>
        </footer>
      </div>
    </div>
  );
}

const TEMPLATES: Record<LoginTemplate, ComponentType<TemplateProps>> = {
  interactive: InteractiveTemplate,
  shapes: ShapesTemplate,
  split: SplitTemplate,
  scenic: ScenicTemplate,
  glass: GlassTemplate,
  centered: CenteredTemplate,
  minimal: MinimalTemplate,
  banner: BannerTemplate,
  corporate: CorporateTemplate,
};

/* ---------- Preview ---------- */

/** The page is laid out at this size, then scaled to the frame's width. */
const CANVAS = { width: 1200, height: 750 };

/** A static stand-in for the sign-in form inside previews. */
function PreviewForm() {
  return (
    <div className="flex flex-col gap-4">
      {["Email", "Password"].map(label => (
        <div key={label} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{label}</span>
          <span className="h-10 rounded-lg border border-input bg-card" />
        </div>
      ))}
      <span className="mt-2 flex h-11 items-center justify-center rounded-lg bg-primary text-base font-medium text-primary-foreground">Sign in</span>
    </div>
  );
}

function PreviewFrame({ accent, className, children }: { accent: Accent; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  // Fit the canvas to the frame's width (the browser's layout is an external system).
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width) setScale(entry.contentRect.width / CANVAS.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Previews can't change <html data-accent>, so the accent is applied to the canvas through the colour tokens.
  const style = { width: CANVAS.width, height: CANVAS.height, transform: `scale(${scale})`, "--color-primary": ACCENT_PRIMARY[accent], "--color-ring": ACCENT_PRIMARY[accent] } as CSSProperties;

  return (
    <div ref={ref} aria-hidden="true" inert className={cn("pointer-events-none relative aspect-[16/10] w-full select-none overflow-hidden rounded-lg border bg-background", className)}>
      <div style={style} className="absolute left-0 top-0 origin-top-left">
        {children}
      </div>
    </div>
  );
}

/* ---------- Public component ---------- */

/** While a workspace's sign-in page is open, the whole app uses its brand colour; the previous one comes back on leave. */
function useWorkspaceAccent(accent: Accent, enabled: boolean) {
  const { brand, setBrand } = useTheme();
  const previous = useRef(brand);
  useEffect(() => {
    if (!enabled) return undefined;
    const prior = previous.current;
    setBrand({ accent, lockAccent: true });
    return () => setBrand(prior);
  }, [accent, enabled, setBrand]);
}

export interface LoginTemplateViewProps {
  /** The public workspace (GET /api/public/workspaces/:slug), or a draft from loginPreviewWorkspace() */
  workspace: LoginTemplateWorkspace;
  /** The sign-in form; previews show a static stand-in when omitted */
  children?: ReactNode;
  /** Scaled-down, non-interactive thumbnail (settings forms) */
  preview?: boolean;
  className?: string;
  /**
   * Other pages in the workspace's sign-in design (the password reset): their own headline and words above the form
   * instead of the sign-in ones.
   */
  heading?: { headline: string; message?: string; formTitle: string; formSubtitle?: string };
}

export function LoginTemplateView({ workspace, children, preview = false, className, heading }: LoginTemplateViewProps) {
  useWorkspaceAccent(workspace.accent, !preview);
  const base = resolve(workspace);
  const r: Resolved = heading
    ? { ...base, headline: heading.headline, message: heading.message ?? "", formTitle: heading.formTitle, formSubtitle: heading.formSubtitle ?? "", formTitleShort: heading.formTitle }
    : base;
  const Template = TEMPLATES[workspace.login.template] ?? SplitTemplate;
  const page = (
    <div data-tf="login-page" data-tf-template={workspace.login.template} className={cn("@container flex flex-col bg-background text-foreground", preview ? "h-full" : cn("min-h-screen", className))}>
      <Template r={r} form={children ?? <PreviewForm />} />
    </div>
  );
  if (!preview) return page;
  return (
    <PreviewFrame accent={workspace.accent} className={className}>
      {page}
    </PreviewFrame>
  );
}
