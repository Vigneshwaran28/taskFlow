// Public API of the workspace settings feature (module configuration, branding, custom CSS).
export { ModuleSettingsEditor, CONFIGURABLE_MODULES, WORKSPACE_SETTINGS } from "./components/ModuleSettingsEditor";
export type {
  ConfigurableModule,
  EditableSettingsKey,
  ModuleFieldErrors,
  ModuleSettingsEditorProps,
  WorkspaceContext,
  WorkspaceSettingKey,
  WorkspaceSettingMeta,
} from "./components/ModuleSettingsEditor";
export { ModuleSettingsPanel } from "./components/ModuleSettingsPanel";
export type { ModuleSettingsPanelProps } from "./components/ModuleSettingsPanel";
export { SecuritySettingsPanel } from "./components/SecuritySettingsPanel";
export type { SecuritySettingsPanelProps } from "./components/SecuritySettingsPanel";
export { TenantSecurityPinCard } from "./components/TenantSecurityPinCard";
export { BrandAssetsFields, validateBrandAssets } from "./components/BrandAssetsFields";
export type { BrandAssets, BrandAssetsErrors, BrandAssetsFieldsProps } from "./components/BrandAssetsFields";
export { CustomCssFields, customCssErrors } from "./components/CustomCssFields";
export type { CustomCssFieldsProps } from "./components/CustomCssFields";
export { TenantCss } from "./components/TenantCss";
export type { TenantCssProps } from "./components/TenantCss";
export { UserCss } from "./components/UserCss";
export type { UserCssProps } from "./components/UserCss";
export {
  CSS_HOOKS,
  CSS_VARIABLES,
  CUSTOM_CSS_RULES,
  TOKEN_SELECTOR,
  USER_CSS_MAX,
  USER_CSS_SNIPPETS,
  bracesBalanced,
  customCssProblem,
  isCustomCssSafeMode,
  lineCount,
  userCssProblem,
} from "./utils/customCss";
export { WorkspaceAdminPage } from "./pages/WorkspaceAdminPage";
export { useTenantAccessCode, useRegenerateTenantAccessCode, useUpdateWorkspaceSettings, useWorkspaceOverview, useWorkspaceSettings, workspaceKeys } from "./hooks/useWorkspace";
export type { SettingsPatch, TenantAccessCode, WorkspaceOverview, WorkspaceSettingsResponse } from "./services/workspaceService";
export { TenantUi } from "./components/TenantUi";
export type { TenantUiProps } from "./components/TenantUi";
export { UiCustomizationFields } from "./components/UiCustomizationFields";
export type { UiCustomizationFieldsProps } from "./components/UiCustomizationFields";
export { usePageEntrance } from "./hooks/usePageEntrance";
export { DEFAULT_UI, UI_FIELDS, UI_OPTIONS, resolveUi, uiDataProps } from "./utils/uiOptions";
export type { UiKey, UiSettings } from "./utils/uiOptions";
