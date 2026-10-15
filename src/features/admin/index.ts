// Public API of the admin (provider console) feature.
export { AdminLoginPage } from "./pages/AdminLoginPage";
export { AdminDashboardPage } from "./pages/AdminDashboardPage";
export { RequireAdmin } from "./components/RequireAdmin";
export type { RequireAdminProps } from "./components/RequireAdmin";
export { useAdminSession, adminKeys } from "./hooks/useAdmin";
export type { AdminSession, Tenant } from "./services/adminService";
