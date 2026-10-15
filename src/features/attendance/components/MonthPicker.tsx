import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatMonth, monthOf, shiftMonth } from "../utils/attendanceMeta";

/** Presentational: previous / next month, never past the current month. */
export function MonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const isCurrent = month >= monthOf();
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="icon" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <p className="min-w-36 text-center text-sm font-medium" aria-live="polite">
        {formatMonth(month)}
      </p>
      <Button variant="secondary" size="icon" onClick={() => onChange(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
