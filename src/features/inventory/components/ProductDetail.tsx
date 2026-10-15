"use client";
import { useState, type ReactNode } from "react";
import Link from "@/components/navigation/Link";
import { useRouter } from "@/lib/navigation";
import { History, PackageX, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/apiClient";
import { formatInteger, formatMoney } from "@/lib/format";
import { useCan } from "@/features/auth";
import { useDeleteProduct, useProduct } from "../hooks/useInventory";
import { stockLevel } from "../utils/stockMeta";
import { MovementList } from "./MovementList";
import { ProductFormDialog } from "./ProductFormDialog";
import { StockMovementForm } from "./StockMovementForm";

function Figure({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Feature component: one product with its figures, stock movement form, and full history. */
export function ProductDetail({ productId }: { productId: number }) {
  const router = useRouter();
  const toast = useToast();
  const canEdit = useCan("inventory.products.edit");
  const canDelete = useCan("inventory.products.delete");
  const canMove = useCan("inventory.stock.move");
  const { data: product, isPending, error, refetch } = useProduct(productId);
  const deleteProduct = useDeleteProduct();
  const [editKey, setEditKey] = useState(0);
  const [confirming, setConfirming] = useState(false);

  if (isPending) return <LoadingState label="Loading product…" />;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Product not found"
        message="It may have been deleted."
        icon={PackageX}
        action={
          <Link href="/inventory" className="text-sm font-medium text-primary hover:underline">
            Back to inventory
          </Link>
        }
      />
    );
  }
  if (error) return <ErrorState message="Unable to load this product." onRetry={() => void refetch()} />;

  const level = stockLevel(product);
  const margin = product.salePrice ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100) : null;

  function handleDelete() {
    if (!product) return;
    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        toast.success(`${product.name} deleted`);
        router.replace("/inventory");
      },
      onError: err => toast.error("Couldn't delete the product", err.message),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-sm text-muted-foreground">{product.sku}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{product.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge tone={level.tone}>{level.label}</Badge>
              {!product.isActive && <Badge tone="neutral">Archived</Badge>}
              {product.category && <span>{product.category}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => setEditKey(Date.now())}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            )}
          </div>
        </div>
        {product.description && <p className="max-w-prose text-sm text-muted-foreground">{product.description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure label="On hand" value={`${formatInteger(product.quantity)} ${product.unit}`} hint={`Reorder at ${formatInteger(product.reorderLevel)}`} />
        <Figure label="Stock value (at cost)" value={formatMoney(product.stockValue)} />
        <Figure label="Cost / sale price" value={`${formatMoney(product.costPrice)} / ${formatMoney(product.salePrice)}`} />
        <Figure label="Margin" value={margin == null ? "—" : `${margin}%`} hint="On the sale price" />
      </div>

      <div className={canMove ? "grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]" : "flex flex-col gap-6"}>
        {canMove && <StockMovementForm product={product} />}
        <section aria-labelledby="movement-history-heading" className="flex min-w-0 flex-col gap-3">
          <h2 id="movement-history-heading" className="text-sm font-semibold">
            Movement history
          </h2>
          {product.movements.length ? (
            <MovementList movements={product.movements} />
          ) : (
            <EmptyState
              title="No movements yet"
              message="Record stock in when it arrives; every change is listed here."
              icon={History}
              action={
                canMove ? (
                  <Button variant="secondary" size="sm" onClick={() => document.getElementById("movement-quantity")?.focus()}>
                    Record stock in
                  </Button>
                ) : undefined
              }
            />
          )}
        </section>
      </div>

      {editKey > 0 && <ProductFormDialog key={editKey} product={product} onClose={() => setEditKey(0)} />}
      <ConfirmDialog
        open={confirming}
        title={`Delete ${product.name}?`}
        message="This also deletes its movement history. Sales order lines keep their description and price. To keep the history, archive it instead."
        pending={deleteProduct.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
