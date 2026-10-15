import type { ReactNode } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatDay } from "@/lib/format";
import type { LeaveRequest } from "../services/attendanceService";
import { LEAVE_PORTIONS, LEAVE_STATUSES, LEAVE_TYPES } from "../utils/attendanceMeta";

export interface LeaveListProps {
  leaves: LeaveRequest[];
  showPerson?: boolean;
  renderActions?: (leave: LeaveRequest) => ReactNode;
}

/** Presentational: leave requests with an optional actions slot per row. */
export function LeaveList({ leaves, showPerson = false, renderActions }: LeaveListProps) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {leaves.map(leave => {
        const status = LEAVE_STATUSES[leave.status];
        return (
          <li key={leave.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {showPerson && <Avatar name={leave.user.name} />}
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  {showPerson && <span className="font-medium">{leave.user.name}</span>}
                  <span className={showPerson ? "text-sm text-muted-foreground" : "font-medium"}>{LEAVE_TYPES[leave.type]?.label}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </p>
                <p className="text-sm tabular-nums">
                  {formatDay(leave.startDate)}
                  {leave.endDate !== leave.startDate ? ` to ${formatDay(leave.endDate)}` : ""}
                  {leave.portion && leave.portion !== "full" ? `, ${LEAVE_PORTIONS[leave.portion].short}` : ""}
                  <span className="text-muted-foreground">
                    {" "}
                    · {leave.days} day{leave.days === 1 ? "" : "s"}
                  </span>
                </p>
                {leave.reason && <p className="mt-0.5 text-sm text-muted-foreground">“{leave.reason}”</p>}
                {leave.reviewer && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {status.label} by {leave.reviewer.name}
                    {leave.reviewNote ? `: ${leave.reviewNote}` : ""}
                  </p>
                )}
              </div>
            </div>
            {renderActions && <div className="flex flex-wrap gap-2 md:justify-end">{renderActions(leave)}</div>}
          </li>
        );
      })}
    </ul>
  );
}
