import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ page, totalPages, total, onPageChange, disabled = false }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2">
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{page}</span> of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 1}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={disabled || page >= totalPages}>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
