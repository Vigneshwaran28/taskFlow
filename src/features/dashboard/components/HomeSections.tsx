"use client";
import Link from "@/components/navigation/Link";
import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Compass, LayoutDashboard, LayoutGrid, Plus } from "lucide-react";
import { LoadingState } from "@/components/shared/States";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { MODULES, MODULE_KEYS, canOpenModule } from "@/app-shell/modules";
import { useCurrentUser } from "@/features/auth";
import { LatestAnnouncements } from "@/features/announcements";
import { OnLeaveToday, TodayCard } from "@/features/attendance";
import { BillingOverview } from "@/features/billing";
import { ClinicOverview } from "@/features/clinic";
import { ExpensesOverview } from "@/features/expenses";
import { InventoryOverview } from "@/features/inventory";
import { LogisticsOverview } from "@/features/logistics";
import { RecentNotes } from "@/features/notes";
import { Celebrations } from "@/features/people";
import { SalesOverview } from "@/features/sales";
import { QuickAddTask, useTaskDialog } from "@/features/tasks";
import { HelpdeskStats } from "@/features/tickets";
import type { HomeSectionKey, SessionUser } from "@/types/session";
import { availableSections, isHidden, orderSections, sizeOf, type HomeSectionMeta } from "../utils/homeSections";
import { AttentionStrip } from "./AttentionStrip";

// Drag and drop is only needed while arranging: loaded on demand.
const HomeArrange = dynamic(() => import("./HomeArrange").then(module => module.HomeArrange), { ssr: false, loading: () => <LoadingState label="Opening the layout editor…" className="py-10" /> });
import { DashboardOverview } from "./DashboardOverview";
import { Greeting } from "./Greeting";

function Section({ title, href, children }: { title: string; href: string | null; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Open
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function TasksSection() {
  const { openCreate } = useTaskDialog();
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <QuickAddTask placeholder="Quick add: type a task and press Enter" />
        </div>
        <Button variant="secondary" onClick={() => openCreate()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New task
        </Button>
      </div>
      <DashboardOverview />
    </>
  );
}

function ModuleShortcuts({ user }: { user: SessionUser }) {
  const features = MODULE_KEYS.filter(key => canOpenModule(user, key));
  if (!features.length) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {features.map(key => {
        const meta = MODULES[key];
        const Icon = meta.icon;
        return (
          <li key={key}>
            <Link
              href={meta.path}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="rounded-lg bg-accent p-2 text-accent-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{meta.label}</span>
                <span className="block text-sm text-muted-foreground">{meta.description}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Widgets that bring their own card and heading render bare; the rest sit under a section heading. */
function renderSection(section: HomeSectionMeta, user: SessionUser): ReactNode {
  const framed = (children: ReactNode) => (
    <Section title={section.title} href={section.href}>
      {children}
    </Section>
  );
  const widgets: Record<HomeSectionKey, () => ReactNode> = {
    attendance: () => (
      <div className="flex flex-col gap-3">
        <TodayCard compact />
        <OnLeaveToday compact />
      </div>
    ),
    celebrations: () => <Celebrations />,
    announcements: () => framed(<LatestAnnouncements />),
    tasks: () => framed(<TasksSection />),
    helpdesk: () => framed(<HelpdeskStats home />),
    expenses: () => framed(<ExpensesOverview />),
    clinic: () => <ClinicOverview />,
    logistics: () => <LogisticsOverview />,
    sales: () => framed(<SalesOverview />),
    billing: () => <BillingOverview />,
    inventory: () => framed(<InventoryOverview />),
    notes: () => framed(<RecentNotes />),
    modules: () => framed(<ModuleShortcuts user={user} />),
  };
  return widgets[section.key]();
}

/** Shown when a person has no module content on their home page: what to do next. */
function GettingStarted({ user, everythingHidden, onCustomize }: { user: SessionUser; everythingHidden: boolean; onCustomize: () => void }) {
  const can = (permission: string) => user.permissions?.includes(permission);
  const steps: { label: string; href: string; hint: string }[] = [{ label: "Complete your profile", href: "/settings", hint: "Add your job title and birthday, and pick a theme." }];
  if (can("workspace.users.manage")) steps.push({ label: "Add people", href: "/users", hint: "Create accounts for your colleagues and give them roles." });
  if (can("workspace.roles.manage")) steps.push({ label: "Set up roles", href: "/roles", hint: "Decide what each role can see and do." });
  return (
    <section aria-labelledby="getting-started-title" className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-accent p-2 text-accent-foreground">
          {everythingHidden ? <LayoutDashboard className="h-5 w-5" aria-hidden="true" /> : <Compass className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h2 id="getting-started-title" className="font-semibold">
            {everythingHidden ? "Your home page is empty" : `Welcome to ${user.tenant?.name ?? "your workspace"}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {everythingHidden
              ? "You've hidden every section. Bring back the ones you want to see."
              : "Your account is ready. What you can use here comes from the roles your workspace admin gives you; once you have access to a module, its summary shows up on this page."}
          </p>
        </div>
      </div>
      {everythingHidden ? (
        <div>
          <Button variant="secondary" onClick={onCustomize}>
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Arrange home
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {steps.map(step => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="flex h-full flex-col gap-1 rounded-lg border p-3 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-sm font-medium">{step.label}</span>
                <span className="text-xs text-muted-foreground">{step.hint}</span>
              </Link>
            </li>
          ))}
          {!can("workspace.users.manage") && (
            <li className="flex flex-col gap-1 rounded-lg border border-dashed p-3">
              <span className="text-sm font-medium">Need access to something?</span>
              <span className="text-xs text-muted-foreground">Ask your workspace admin to add a role that includes it.</span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * Feature component: the home page. A greeting, "Needs your attention" (counts waiting on this person), then the module
 * sections their permissions cover, in their saved order (or their role's default).
 */
export function HomeSections() {
  const { data: user } = useCurrentUser();
  const [arranging, setArranging] = useState(false);
  if (!user) return null;

  const layout = user.preferences?.homeLayout ?? null;
  const available = orderSections(availableSections(user), layout?.order);
  const shown = available.filter(section => !isHidden(section, layout));
  const hasContent = available.some(section => section.content);
  const everythingHidden = available.length > 0 && !shown.length;
  const openCustomize = () => setArranging(true);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Greeting />
        {!arranging && (
          <Button variant="ghost" size="sm" onClick={openCustomize} data-tour="customize-home">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Arrange home
          </Button>
        )}
      </div>

      <AttentionStrip user={user} />

      {arranging ? (
        <HomeArrange sections={available} saved={layout} onDone={() => setArranging(false)} />
      ) : (
        <>
          {(!hasContent || everythingHidden) && <GettingStarted user={user} everythingHidden={everythingHidden} onCustomize={openCustomize} />}
          {/* Sections fill a two-column grid on wide screens: a full section spans both, half sections sit side by side. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {shown.map(section => (
              <div key={section.key} data-home-section={section.key} data-home-size={sizeOf(section.key, layout)} className={cn("flex min-w-0 flex-col gap-3", sizeOf(section.key, layout) === "half" ? "lg:col-span-1" : "lg:col-span-2")}>
                {renderSection(section, user)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
