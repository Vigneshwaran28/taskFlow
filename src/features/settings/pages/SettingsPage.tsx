"use client";
// Settings, one tab at a time (?tab=…, linkable): the person's own profile, appearance, notifications, and password,
// then the workspace admin's tabs they have access to. Only the active tab is mounted, so hidden tabs load nothing.
// Switching away from a tab with unsaved changes asks first.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Building2, GraduationCap, KeyRound, LayoutGrid, Palette, PanelLeft, PanelsTopLeft, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { SubscriptionSummaryCard } from "@/features/broadcasts";
import { useCan, useCurrentUser } from "@/features/auth";
import { ModuleSettingsPanel, SecuritySettingsPanel, type EditableSettingsKey } from "@/features/workspace";
import { useSearchParam } from "@/lib/navigation";
import type { SessionUser } from "@/types/session";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { IconCustomizerSection } from "../components/IconCustomizerSection";
import { NavbarCustomizerSection } from "../components/NavbarCustomizerSection";
import { NotificationSettings } from "../components/NotificationSettings";
import { PasswordForm } from "../components/PasswordForm";
import { ProfileForm } from "../components/ProfileForm";
import { SettingsSection } from "../components/SettingsSection";
import { UnsavedChangesProvider, useUnsavedReporter } from "../components/UnsavedChanges";
import { WorkspaceInfo } from "../components/WorkspaceInfo";

type TabId = "profile" | "appearance" | "navigation" | "notifications" | "password" | "workspace" | "branding" | "company" | "modules" | "help" | "restrictions";

interface SettingsTab extends TabItem {
  id: TabId;
  render: (user: SessionUser) => ReactNode;
}

/** Module settings that have their own tab (the rest are under Modules). */
const OWN_TABS: readonly EditableSettingsKey[] = ["branding", "company", "help"];

/** Bridges a panel's per-module onDirtyChange to the page's unsaved-changes tracking. */
function ModulesPanel({ modules, exclude, defaultOpen }: { modules?: readonly EditableSettingsKey[]; exclude?: readonly EditableSettingsKey[]; defaultOpen?: boolean }) {
  const report = useUnsavedReporter();
  const onDirtyChange = useCallback((module: EditableSettingsKey, dirty: boolean) => report(`module:${module}`, dirty), [report]);
  return <ModuleSettingsPanel modules={modules} exclude={exclude} defaultOpen={defaultOpen} onDirtyChange={onDirtyChange} />;
}

function RestrictionsPanel() {
  const report = useUnsavedReporter();
  const onDirtyChange = useCallback((dirty: boolean) => report("restrictions", dirty), [report]);
  return <SecuritySettingsPanel onDirtyChange={onDirtyChange} />;
}

/** The tabs this person can open, in order. */
function useSettingsTabs(user: SessionUser | null | undefined): SettingsTab[] {
  const canUsers = useCan("workspace.users.manage");
  const canSettings = useCan("workspace.settings.manage");
  const isAdmin = canUsers || canSettings;
  const tabs: (SettingsTab | false)[] = [
    {
      id: "profile",
      label: "Profile",
      icon: UserRound,
      render: current => (
        <>
          <SettingsSection id="profile" title="Profile" description="Your name, picture, job title, and birthday as colleagues see them.">
            <ProfileForm user={current} />
          </SettingsSection>
          {/* Admins see the plan under Workspace. */}
          {!isAdmin && <SubscriptionSummaryCard />}
        </>
      ),
    },
    { id: "appearance", label: "Appearance", icon: Palette, render: current => <AppearanceSettings user={current} /> },
    {
      id: "navigation",
      label: "Navigation",
      icon: PanelLeft,
      render: () => (
        <>
          <SettingsSection
            id="navigation"
            title="Navbar & navigation"
            description="Customize the top navigation bar style, sticky scrolling, quick actions, and sidebar navigation layout."
          >
            <NavbarCustomizerSection />
          </SettingsSection>
          <SettingsSection
            id="icons"
            title="Icon library & customization"
            description="Choose your preferred icon family from 6 free icon libraries: Lucide Icons, Tabler Icons, Google Material Symbols, Heroicons, Phosphor Icons, and Remix Icon. Customize line weight and module-specific icons."
          >
            <IconCustomizerSection />
          </SettingsSection>
        </>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      render: () => (
        <SettingsSection title="Notifications" description="How TaskFlow alerts you about reminders.">
          <NotificationSettings />
        </SettingsSection>
      ),
    },
    {
      id: "password",
      label: "Password",
      icon: KeyRound,
      render: () => (
        <SettingsSection title="Password" description="Use a strong password you don't use elsewhere. Changing it signs you out on other devices.">
          <PasswordForm />
        </SettingsSection>
      ),
    },
    isAdmin && {
      id: "workspace",
      label: "Workspace",
      icon: LayoutGrid,
      render: current => (
        <>
          {canUsers && current.tenant && (
            <SettingsSection title="Workspace" description="Your company's plan. Modules and user limits are set by your provider. Modules you switched off show as not included.">
              <WorkspaceInfo tenant={current.tenant} />
            </SettingsSection>
          )}
          <SubscriptionSummaryCard />
        </>
      ),
    },
    canSettings && {
      id: "branding",
      label: "Branding",
      icon: PanelsTopLeft,
      render: () => (
        <SettingsSection title="Branding" description="Website title, logo, brand colour and style, background picture, the sign-in page, and custom CSS for everyone in the workspace.">
          <ModulesPanel modules={["branding"]} defaultOpen />
        </SettingsSection>
      ),
    },
    canSettings && {
      id: "company",
      label: "Company",
      icon: Building2,
      render: () => (
        <SettingsSection title="Company details" description="Legal name, address, tax ID, and currency. Printed on invoices and prescriptions.">
          <ModulesPanel modules={["company"]} defaultOpen />
        </SettingsSection>
      ),
    },
    canSettings && {
      id: "modules",
      label: "Modules",
      icon: SlidersHorizontal,
      render: () => (
        <SettingsSection title="Module settings" description="Tune each module to how your company works: working days, leave rules, service targets, invoicing, and more.">
          <ModulesPanel exclude={OWN_TABS} />
        </SettingsSection>
      ),
    },
    canSettings && {
      id: "help",
      label: "Help & onboarding",
      icon: GraduationCap,
      render: () => (
        <SettingsSection title="Help & onboarding" description="Guided tours for people new to the workspace and its modules, the help centre, and a welcome message. Switch any of it off.">
          <ModulesPanel modules={["help"]} defaultOpen />
        </SettingsSection>
      ),
    },
    canSettings && {
      id: "restrictions",
      label: "Security & restrictions",
      icon: ShieldCheck,
      render: () => (
        <SettingsSection title="Security & restrictions" description="Password rules, how long sign-ins last, which email domains accounts may use, and which modules your workspace uses.">
          <RestrictionsPanel />
        </SettingsSection>
      ),
    },
  ];
  return user ? tabs.filter((tab): tab is SettingsTab => Boolean(tab)) : [];
}

export function SettingsPage() {
  const { data: user, isPending, error, refetch } = useCurrentUser();
  const tabs = useSettingsTabs(user);
  const [tabParam, setTabParam] = useSearchParam("tab");
  const active = tabs.find(tab => tab.id === tabParam) ?? tabs[0];
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);

  // Forms report unsaved changes here (by id); a ref, because only switching and leaving read it.
  const unsaved = useRef(new Set<string>());
  const report = useCallback((id: string, dirty: boolean) => {
    if (dirty) unsaved.current.add(id);
    else unsaved.current.delete(id);
  }, []);

  // Old links pointed at sections with #security or #navigation: open the matching tab.
  useEffect(() => {
    if (!tabParam && (window.location.hash === "#navigation" || window.location.hash === "#icons")) setTabParam("navigation");
    if (!tabParam && window.location.hash === "#security") setTabParam("restrictions");
  }, [tabParam, setTabParam]);

  // Leaving the page (reload, closing the tab) with unsaved changes: the browser asks (an external system → effect).
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!unsaved.current.size) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const open = useCallback((id: string) => setTabParam(id === "profile" ? null : id), [setTabParam]);

  function requestTab(id: string) {
    if (id === active?.id) return;
    if (unsaved.current.size) setPendingTab(id as TabId);
    else open(id);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader title="Settings" description="Your profile and preferences, and your workspace's settings." />
      {isPending ? (
        <LoadingState label="Loading settings…" />
      ) : error || !user || !active ? (
        <ErrorState message="Unable to load your settings." onRetry={() => void refetch()} />
      ) : (
        <UnsavedChangesProvider report={report}>
          <Tabs name="settings" label="Settings" tabs={tabs} active={active.id} onChange={requestTab}>
            {/* Keyed by tab: switching mounts the new tab fresh (and unmounts the old one, which stops its queries). */}
            <div key={active.id} className="mt-4 rounded-xl border bg-card px-4 shadow-sm sm:px-6" data-settings-tab={active.id}>
              {active.render(user)}
            </div>
          </Tabs>
        </UnsavedChangesProvider>
      )}
      <ConfirmDialog
        open={pendingTab !== null}
        title="Leave without saving?"
        message="This tab has changes that aren't saved yet. They'll be lost if you switch tabs."
        confirmLabel="Discard changes"
        onCancel={() => setPendingTab(null)}
        onConfirm={() => {
          const next = pendingTab;
          setPendingTab(null);
          unsaved.current.clear();
          if (next) open(next);
        }}
      />
    </div>
  );
}
