"use client";
import type { ReactNode } from "react";
import { Boxes, SearchX } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { useProducts } from "../hooks/useInventory";
import type { ProductQuery } from "../services/inventoryService";
import { ProductTable } from "./ProductTable";

export interface ProductListProps {
  query: ProductQuery;
  isFiltered: boolean;
  emptyAction?: ReactNode;
  onPageChange: (page: number) => void;
}

/** Feature component: one page of products for the query. */
export function ProductList({ query, isFiltered, emptyAction, onPageChange }: ProductListProps) {
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useProducts(query);

  if (isPending) return <LoadingState label="Loading products…" />;
  if (error) return <ErrorState message="Unable to load products." onRetry={() => void refetch()} />;
  if (!data.items.length) {
    return isFiltered ? (
      <EmptyState title="No products match" message="Try a different search or clear the filters." icon={SearchX} />
    ) : (
      <EmptyState title="No products yet" message="Add the items you stock, with their opening quantity." icon={Boxes} action={emptyAction} />
    );
  }
  return (
    <div className="flex flex-col gap-2" aria-busy={isFetching}>
      <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
        <ProductTable products={data.items} />
      </div>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={onPageChange} disabled={isFetching} />
    </div>
  );
}
