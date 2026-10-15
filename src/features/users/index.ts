// Public API of the workspace user management feature (tenant admins).
export { UsersPage } from "./pages/UsersPage";
export { useManagedUsers, userKeys } from "./hooks/useUsers";
export type { ManagedUser, Seats } from "./services/userService";
