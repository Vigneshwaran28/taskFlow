"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { MODULES } from "@/app-shell/modules";
import { cleanLoginBranding, hasLoginBrandingErrors, useCurrentUser, validateLoginBranding } from "@/features/auth";
import { fieldErrorsOf } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import type { WorkspaceSettings } from "@/types/session";
import { useUpdateWorkspaceSettings } from "../hooks/useWorkspace";
import { validateBrandAssets } from "./BrandAssetsFields";
import { customCssErrors } from "./CustomCssFields";
import type { SettingsPatch } from "../services/workspaceService";
import {
  CONFIGURABLE_MODULES,
  ModuleSettingsEditor,
  WORKSPACE_SETTINGS,
  type EditableSettingsKey,
  type ModuleFieldErrors,
  type WorkspaceContext,
  type WorkspaceSettingKey,
  type WorkspaceSettingMeta,
} from "./ModuleSettingsEditor";

const isWorkspaceKey = (key: EditableSettingsKey): key is WorkspaceSettingKey => key in WORKSPACE_SETTINGS;

/** Label, description, and icon for a card: the module's own, or the workspace setting's. */
const metaFor = (key: EditableSettingsKey): WorkspaceSettingMeta => (isWorkspaceKey(key) ? WORKSPACE_SETTINGS[key] : MODULES[key]);

/** "branding.logoUrl" -> { logoUrl } for one module's server errors (the bare "branding" key is the summary). */
function moduleErrors(errors: Record<string, string>, module: string): ModuleFieldErrors {
  const prefix = `${module}.`;
  return Object.fromEntries(Object.entries(errors).filter(([key]) => key.startsWith(prefix)).map(([key, message]) => [key.slice(prefix.length), message]));
}

interface ModuleCardProps<K extends EditableSettingsKey> {
  module: K;
  saved: WorkspaceSettings[K];
  workspaceName: string;
  workspace?: WorkspaceContext;
  defaultOpen?: boolean;
  onDirtyChange?: (module: K, dirty: boolean) => void;
}

/** One module: a collapsible card with its own draft and Save. */
function ModuleCard<K extends EditableSettingsKey>({ module, saved, workspaceName, workspace, defaultOpen = false, onDirtyChange }: ModuleCardProps<K>) {
  const toast = useToast();
  const update = useUpdateWorkspaceSettings();
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState<WorkspaceSettings[K]>(saved);
  const [editorKey, setEditorKey] = useState(0);
  // Field errors from the last save, shown inline until that save is retried or discarded.
  const [serverErrors, setServerErrors] = useState<ModuleFieldErrors>({});
  const meta = metaFor(module);
  const Icon = meta.icon;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const panelId = `module-settings-${module}`;

  // Tells the settings page about unsaved changes (it warns before switching tabs); cleared when the card goes away.
  useEffect(() => {
    onDirtyChange?.(module, dirty);
  }, [onDirtyChange, module, dirty]);
  useEffect(() => () => onDirtyChange?.(module, false), [onDirtyChange, module]);

  function notSaved(why?: string) {
    setOpen(true);
    toast.error(`${meta.label} settings not saved`, why ?? "Fix the highlighted fields first.");
  }

  function handleSave() {
    let payload: WorkspaceSettings[K] = draft;
    if (module === "branding") {
      const branding = draft as WorkspaceSettings["branding"];
      // The server's rules, checked here first; problems show next to their fields.
      if (hasLoginBrandingErrors(validateLoginBranding(branding))) return notSaved("Fix the highlighted sign-in page fields first.");
      const assetErrors = validateBrandAssets(branding);
      if (assetErrors.logoUrl || assetErrors.backgroundImage) return notSaved(assetErrors.logoUrl ?? assetErrors.backgroundImage);
      const cssErrors = customCssErrors(branding);
      if (cssErrors.login || cssErrors.app) return notSaved(cssErrors.login ?? cssErrors.app);
      payload = cleanLoginBranding({ ...branding, logoUrl: branding.logoUrl?.trim() ?? "", backgroundImage: branding.backgroundImage?.trim() ?? "" }) as WorkspaceSettings[K];
    }
    setServerErrors({});
    update.mutate({ [module]: payload } as SettingsPatch, {
      onSuccess: () => toast.success(`${meta.label} settings saved`),
      onError: error => {
        const all = fieldErrorsOf(error);
        const fields = moduleErrors(all, module);
        setServerErrors(fields);
        notSaved(Object.keys(fields).length ? "Fix the highlighted fields first." : (all[module] ?? Object.values(all)[0] ?? error.message));
      },
    });
  }

  return (
    <li className="rounded-xl border bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(current => !current)}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{meta.label}</span>
          <span className="block truncate text-xs text-muted-foreground">{meta.description}</span>
        </span>
        {dirty && <span className="text-xs font-medium text-warning">Unsaved</span>}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-4 border-t px-4 pt-4">
          <ModuleSettingsEditor
            key={editorKey}
            module={module}
            value={draft}
            onChange={next => {
              setDraft(next);
              setServerErrors({});
            }}
            workspaceName={workspaceName}
            workspace={workspace}
            errors={serverErrors}
          />
          {/* Sticks to the bottom of the screen while a long module (branding) is being edited. */}
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t bg-card/95 px-4 py-3 backdrop-blur">
            {dirty && <span className="mr-auto text-xs text-muted-foreground">You have unsaved changes.</span>}
            <Button
              variant="ghost"
              disabled={!dirty || update.isPending}
              onClick={() => {
                setDraft(saved);
                setServerErrors({});
                setEditorKey(key => key + 1);
              }}
            >
              Discard changes
            </Button>
            <Button onClick={handleSave} loading={update.isPending} disabled={!dirty}>
              Save
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export interface ModuleSettingsPanelProps {
  /** Only these settings (in this order); default: workspace-wide settings, then every enabled module that has any */
  modules?: readonly EditableSettingsKey[];
  /** Leave out these settings */
  exclude?: readonly EditableSettingsKey[];
  /** Start with the cards open (a page showing a single module) */
  defaultOpen?: boolean;
  /** Called when a card's draft gains or loses unsaved changes */
  onDirtyChange?: (module: EditableSettingsKey, dirty: boolean) => void;
}

/** Feature component (workspace admins): workspace-wide settings and module settings, one card each. */
export function ModuleSettingsPanel({ modules: only, exclude = [], defaultOpen = false, onDirtyChange }: ModuleSettingsPanelProps = {}) {
  const { data: user } = useCurrentUser();
  const tenant = user?.tenant;
  if (!tenant) return null;
  const all: EditableSettingsKey[] = [...(Object.keys(WORKSPACE_SETTINGS) as WorkspaceSettingKey[]), ...CONFIGURABLE_MODULES.filter(module => tenant.features.includes(module))];
  const keys = (only ?? all).filter(module => all.includes(module) && !exclude.includes(module) && tenant.settings?.[module]);
  if (!keys.length) return <p className="text-sm text-muted-foreground">None of your modules have settings.</p>;
  return (
    <ul className="flex max-w-3xl flex-col gap-2">
      {keys.map(module => (
        <ModuleCard
          key={module}
          module={module}
          saved={tenant.settings[module]}
          workspaceName={tenant.name}
          defaultOpen={defaultOpen}
          onDirtyChange={onDirtyChange}
          workspace={module === "branding" ? { slug: tenant.slug, features: tenant.features, companyName: tenant.settings.company?.legalName || tenant.name } : undefined}
        />
      ))}
    </ul>
  );
}
