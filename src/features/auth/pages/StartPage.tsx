"use client";
// The start page (/): what TaskFlow is, the platform's status, every workspace this browser is signed in to (side by
// side: each keeps its own sign-in), and ways to sign in to another one.
import Link from "@/components/navigation/Link";
import { Boxes, Building2, CalendarCheck, CalendarClock, LifeBuoy, LogOut, Mail, PackageSearch, ReceiptText, Stethoscope, Truck, Wrench } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
// Direct file imports: the maintenance feature's index imports this feature's hooks.
import { usePlatformStatus } from "@/features/maintenance/hooks/useMaintenance";
import { expectedBack, windowRange } from "@/features/maintenance/utils/maintenanceText";
import { WorkspaceAddressForm } from "../components/WorkspaceAddressForm";
import { WorkspaceSessionList } from "../components/WorkspaceSessionList";
import { usePublicWorkspace, useSignOutWorkspace, useWorkspaceSessions } from "../hooks/useAuth";
import { useRememberedWorkspace, workspaceLoginPath } from "../utils/rememberedWorkspace";

const HIGHLIGHTS = [
  { icon: LifeBuoy, title: "Help desk & tasks", text: "Tickets with targets, tasks, notes, and team messaging." },
  { icon: Boxes, title: "Sales & inventory", text: "Customers, orders, stock levels, and low-stock alerts." },
  { icon: ReceiptText, title: "Billing & expenses", text: "Quotes, tax invoices, payments, and expense approvals." },
  { icon: Truck, title: "Logistics", text: "Shipments, dispatch, fleet, and public tracking links." },
  { icon: Stethoscope, title: "Clinic", text: "Appointments, token queues, patients, and prescriptions." },
  { icon: CalendarCheck, title: "People", text: "Attendance, leave, holidays, birthdays, and announcements." },
];

/** The workspace this browser used last, when it isn't signed in any more: one click to its sign-in page. */
function RememberedWorkspace({ slug }: { slug: string }) {
  const { data: workspace } = usePublicWorkspace(slug);
  if (!workspace?.active) return null;
  return (
    <Link
      href={workspaceLoginPath(slug)}
      className="flex items-center gap-3 rounded-xl border bg-accent/40 px-4 py-3 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Building2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Sign in to {workspace.siteTitle}</span>
        <span className="block truncate text-xs text-muted-foreground">The workspace you used last on this browser</span>
      </span>
    </Link>
  );
}

/** Platform-wide maintenance, now or coming up (each workspace's own window shows on its pages). */
function PlatformNotice() {
  const { data } = usePlatformStatus(null);
  const active = data?.maintenance.active;
  const upcoming = data?.maintenance.upcoming;
  if (active) {
    return (
      <p role="status" className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        <span>
          <span className="font-medium">TaskFlow is down for maintenance.</span> {active.message ? `${active.message} ` : ""}
          {expectedBack(active)}
        </span>
      </p>
    );
  }
  if (!upcoming) return null;
  return (
    <p role="status" className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
      <span>
        <span className="font-medium">Scheduled maintenance {windowRange(upcoming)}.</span> {upcoming.message}
      </span>
    </p>
  );
}

export function StartPage() {
  const toast = useToast();
  const { data: sessions, isPending, error, refetch } = useWorkspaceSessions();
  const remembered = useRememberedWorkspace();
  const signOutAll = useSignOutWorkspace();
  const signedIn = sessions ?? [];
  const showRemembered = remembered && !signedIn.some(session => session.slug === remembered);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <Logo />
        <nav aria-label="Site" className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <Link href="/track" className="inline-flex items-center gap-1.5 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <PackageSearch className="h-4 w-4" aria-hidden="true" />
            Track a shipment
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 pb-16 sm:px-6">
        <section aria-labelledby="start-hero" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 py-10 text-white sm:px-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <h1 id="start-hero" className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              One workspace for how your organisation runs.
            </h1>
            <p className="mt-3 text-indigo-100">
              Help desk, operations, billing, logistics, clinics, and people, each company in its own workspace with only the modules it needs.
            </p>
          </div>
        </section>

        <PlatformNotice />

        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="start-workspaces" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="start-workspaces" className="text-xl font-semibold tracking-tight">
                  Your workspaces
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Each one has its own sign-in on this browser, so you can keep several open side by side.</p>
              </div>
              {signedIn.length > 1 && (
                <button
                  type="button"
                  onClick={() => signOutAll.mutate({ all: true }, { onSuccess: () => toast.success("Signed out of every workspace") })}
                  disabled={signOutAll.isPending}
                  className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out of all
                </button>
              )}
            </div>
            {isPending ? (
              <LoadingState label="Checking your sign-ins…" className="py-10" />
            ) : error ? (
              <ErrorState message="Unable to check your sign-ins." onRetry={() => void refetch()} />
            ) : signedIn.length ? (
              <WorkspaceSessionList sessions={signedIn} />
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">You aren&apos;t signed in to any workspace on this browser yet.</p>
            )}
          </section>

          <section aria-labelledby="start-sign-in" className="flex flex-col gap-4">
            <div>
              <h2 id="start-sign-in" className="text-xl font-semibold tracking-tight">
                {signedIn.length ? "Sign in to another workspace" : "Sign in"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Use your workspace&apos;s address, or your email if you don&apos;t know it.</p>
            </div>
            {showRemembered && <RememberedWorkspace slug={remembered} />}
            <WorkspaceAddressForm />
            <Link
              href="/login?generic=1"
              className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                Sign in with your email
              </span>
              <span className="text-xs text-muted-foreground">We&apos;ll find your workspace. If your email is in several, you pick one.</span>
            </Link>
            <p className="text-xs text-muted-foreground">No account? Your workspace administrator creates accounts.</p>
          </section>
        </div>

        <section aria-labelledby="start-modules" className="flex flex-col gap-4">
          <h2 id="start-modules" className="text-xl font-semibold tracking-tight">
            What&apos;s inside
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <span className="rounded-lg bg-accent p-2 text-accent-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>TaskFlow · each workspace gets only the modules it needs.</span>
          <span className="flex gap-4">
            <Link href="/track" className="hover:text-foreground">
              Track a shipment
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
