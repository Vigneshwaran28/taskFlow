// Public API of the auth feature.
export { LoginPage } from "./pages/LoginPage";
export { WorkspaceLoginPage } from "./pages/WorkspaceLoginPage";
export { StartPage } from "./pages/StartPage";
export { WorkspaceSessionList } from "./components/WorkspaceSessionList";
export { LoginForm } from "./components/LoginForm";
export type { LoginFormProps } from "./components/LoginForm";
export { LoginBrandingFields, CopyButton, WorkspaceLoginLink, useWorkspaceLoginUrl } from "./components/LoginBrandingFields";
export type { LoginBrandingFieldsProps, CopyButtonProps } from "./components/LoginBrandingFields";
export {
  LoginTemplateView,
  LOGIN_TEMPLATES,
  LOGIN_BACKGROUNDS,
  LOGIN_BACKGROUND_LABELS,
  LOGIN_LIMITS,
  cleanLoginBranding,
  hasLoginBrandingErrors,
  loginPreviewWorkspace,
  validateLoginBranding,
} from "./components/login-templates";
export type { LoginBrandingErrors, LoginTemplateMeta, LoginTemplateViewProps, LoginTemplateWorkspace } from "./components/login-templates";
export {
  REMEMBERED_WORKSPACE_KEY,
  getRememberedWorkspace,
  rememberWorkspace,
  forgetWorkspace,
  useRememberedWorkspace,
  workspaceLoginPath,
  workspaceLoginUrl,
} from "./utils/rememberedWorkspace";
export { ResetPasswordPage } from "./pages/ResetPasswordPage";
export { AuthLayout } from "./components/AuthLayout";
export { ForcePasswordChange } from "./components/ForcePasswordChange";
export { ForgotPasswordDialog } from "./components/ForgotPasswordDialog";
export type { ForgotPasswordDialogProps } from "./components/ForgotPasswordDialog";
export {
  useCurrentUser,
  useLogout,
  useUpdateProfile,
  useChangePassword,
  useFeatures,
  useHasFeature,
  useModuleSettings,
  usePermissions,
  useCan,
  useSiteTitle,
  useUpdatePreferences,
  usePublicWorkspace,
  useWorkspaceSessions,
  useSignOutWorkspace,
  usePasswordRule,
  useAllowedEmailDomains,
  setCurrentSession,
  authKeys,
} from "./hooks/useAuth";
export type { ProfileInput } from "./services/authService";
export { ROLE_META, roleTone } from "./utils/roles";
