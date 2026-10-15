// Public API of the access control feature (roles, permissions, audit log).
export { RolesPage } from "./pages/RolesPage";
export { AuditPage } from "./pages/AuditPage";
export { useRoles, accessKeys } from "./hooks/useAccess";
export { AUDIT_ACTIONS } from "./components/AuditLog";
export type { Role, Permission, RolesResponse, AuditEntry } from "./services/accessService";
