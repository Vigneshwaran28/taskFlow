import Link from "@/components/navigation/Link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatInteger, formatMoney } from "@/lib/format";
import type { Product } from "../services/inventoryService";
import { stockLevel } from "../utils/stockMeta";

/** Presentational: products with stock level and value. Each name links to the product page. */
export function ProductTable({ products }: { products: Product[] }) {
  return (
    <div className="relative overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Products</caption>
        <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-semibold">Product</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">On hand</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Reorder at</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Cost</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Price</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Stock value</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map(product => {
            const level = stockLevel(product);
            return (
              <tr key={product.id} className={cn("hover:bg-muted/40", !product.isActive && "opacity-60")}>
                <td className="px-3 py-2.5">
                  <Link href={`/inventory/${product.id}`} className="font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                    {product.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    <span className="font-mono">{product.sku}</span>
                    {product.category ? ` · ${product.category}` : ""}
                    {!product.isActive ? " · Archived" : ""}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={level.tone}>{level.label}</Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums">
                  {formatInteger(product.quantity)} <span className="text-xs font-normal text-muted-foreground">{product.unit}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatInteger(product.reorderLevel)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(product.costPrice)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(product.salePrice)}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatMoney(product.stockValue)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
