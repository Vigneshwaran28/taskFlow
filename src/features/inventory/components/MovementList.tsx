import Link from "@/components/navigation/Link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { formatInteger } from "@/lib/format";
import type { StockMovement } from "../services/inventoryService";
import { MOVEMENT_TYPES } from "../utils/stockMeta";

/** Presentational: stock movements, newest first. */
export function MovementList({ movements, showProduct = false }: { movements: StockMovement[]; showProduct?: boolean }) {
  return (
    <div className="relative overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Stock movements</caption>
        <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-semibold">When</th>
            {showProduct && <th scope="col" className="px-3 py-2.5 font-semibold">Product</th>}
            <th scope="col" className="px-3 py-2.5 font-semibold">Movement</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Change</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Balance</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Reason / reference</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">By</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {movements.map(movement => {
            const meta = MOVEMENT_TYPES[movement.type] ?? MOVEMENT_TYPES.adjust;
            const Icon = meta.icon;
            return (
              <tr key={movement.id}>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{formatDateTime(movement.createdAt)}</td>
                {showProduct && (
                  <td className="px-3 py-2">
                    <Link href={`/inventory/${movement.productId}`} className="font-medium hover:underline">
                      {movement.product?.name}
                    </Link>
                    <span className="block font-mono text-xs text-muted-foreground">{movement.product?.sku}</span>
                  </td>
                )}
                <td className="px-3 py-2">
                  <Badge tone={meta.tone}>
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {meta.label}
                  </Badge>
                </td>
                <td className={cn("whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums", movement.change > 0 ? "text-success" : "text-foreground")}>
                  {movement.change > 0 ? "+" : "−"}
                  {formatInteger(Math.abs(movement.change))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatInteger(movement.balanceAfter)}</td>
                <td className="max-w-64 px-3 py-2 text-muted-foreground">
                  <span className="block truncate">{[movement.reason, movement.reference].filter(Boolean).join(" · ") || "—"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{movement.createdBy?.name ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
