// Public API of the maintenance feature: the maintenance page, its gate, and in-app notices.
export { MaintenanceGate } from "./components/MaintenanceGate";
export { MaintenanceBanner } from "./components/MaintenanceBanner";
export { MaintenanceScreen } from "./components/MaintenanceScreen";
export type { MaintenanceScreenProps } from "./components/MaintenanceScreen";
export { usePlatformStatus, maintenanceKeys } from "./hooks/useMaintenance";
export { expectedBack, windowRange, scopeLabel } from "./utils/maintenanceText";
