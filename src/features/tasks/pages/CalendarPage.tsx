"use client";
// Month calendar of tasks by due date. The visible month lives in the URL (?month=2026-09).
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { useSearchParamsState } from "@/lib/navigation";
import { useTaskDialog } from "../components/TaskDialogProvider";
import { TaskCalendar } from "../components/TaskCalendar";

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

function parseMonth(value: string | null) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  const now = new Date();
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
}

const monthParam = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export function CalendarPage() {
  const { openCreate, openEdit } = useTaskDialog();
  const [params, setParams] = useSearchParamsState();
  const month = parseMonth(params.get("month"));

  function goToMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setParams(offset === 0 ? {} : { month: monthParam(next) }, { push: true });
  }

  function createOn(day: Date) {
    const due = new Date(day);
    due.setHours(9, 0, 0, 0);
    openCreate({ dueAt: due.toISOString() });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={monthFormat.format(month)}
        description="Tasks by due date. Click a day to add a task."
        actions={
          <>
            <Button variant="secondary" size="icon" onClick={() => goToMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary" onClick={() => setParams({}, { push: true })}>
              Today
            </Button>
            <Button variant="secondary" size="icon" onClick={() => goToMonth(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        }
      />

      <TaskCalendar month={month} onCreate={createOn} onOpen={openEdit} />
    </div>
  );
}
