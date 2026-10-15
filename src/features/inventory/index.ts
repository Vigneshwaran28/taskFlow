// Public API of the inventory feature.
export { InventoryPage } from "./pages/InventoryPage";
export { ProductPage } from "./pages/ProductPage";
export { InventoryOverview } from "./components/InventoryOverview";
export { useProducts, inventoryKeys } from "./hooks/useInventory";
export type { Product, ProductQuery, StockMovement } from "./services/inventoryService";
