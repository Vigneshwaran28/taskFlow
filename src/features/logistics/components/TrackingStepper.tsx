// Progress along the happy path; failed, returned, and cancelled are shown as a distinct exception.
import { AlertTriangle, Check, Undo2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ShipmentStatus } from "../services/logisticsService";
import { PROGRESS_STEPS, SHIPMENT_STATUSES } from "../utils/logisticsMeta";

/** How far along the path an exception got: the last happy-path step in its history. */
function reachedIndex(status: ShipmentStatus, history: ShipmentStatus[]) {
  const direct = PROGRESS_STEPS.indexOf(status);
  if (direct >= 0) return direct;
  return Math.max(0, ...history.map(item => PROGRESS_STEPS.indexOf(item)));
}

const EXCEPTION_ICON = { failed: AlertTriangle, returned: Undo2, cancelled: XCircle } as const;

export function TrackingStepper({ status, history }: { status: ShipmentStatus; history: ShipmentStatus[] }) {
  const reached = reachedIndex(status, history);
  const exception = status === "failed" || status === "returned" || status === "cancelled" ? status : null;
  const ExceptionIcon = exception ? EXCEPTION_ICON[exception] : null;

  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Delivery progress" className="grid grid-cols-5 gap-1">
        {PROGRESS_STEPS.map((step, index) => {
          const done = index < reached || (index === reached && status === "delivered");
          const current = !exception && index === reached;
          const stopped = exception && index === reached;
          return (
            <li key={step} aria-current={current || stopped ? "step" : undefined} className="flex flex-col items-center gap-2 text-center">
              <div className="flex w-full items-center">
                <span aria-hidden="true" className={cn("h-1 flex-1 rounded-full", index === 0 ? "invisible" : index <= reached ? (exception ? "bg-muted-foreground/40" : "bg-primary") : "bg-muted")} />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                    done && !exception && "border-primary bg-primary text-primary-foreground",
                    done && exception && "border-muted-foreground/40 bg-muted text-muted-foreground",
                    current && status !== "delivered" && "border-primary bg-card text-primary ring-4 ring-primary/20",
                    stopped && "border-destructive bg-destructive text-destructive-foreground",
                    !done && !current && !stopped && "border-border bg-card text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : stopped && ExceptionIcon ? <ExceptionIcon className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  aria-hidden="true"
                  className={cn("h-1 flex-1 rounded-full", index === PROGRESS_STEPS.length - 1 ? "invisible" : index < reached ? (exception ? "bg-muted-foreground/40" : "bg-primary") : "bg-muted")}
                />
              </div>
              <span className={cn("text-xs leading-tight sm:text-sm", current || stopped ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground")}>
                {SHIPMENT_STATUSES[step].label}
                <span className="sr-only">{done ? " (completed)" : current ? " (current)" : stopped ? " (stopped here)" : " (upcoming)"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {exception && ExceptionIcon && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <ExceptionIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {exception === "failed" && "A delivery attempt failed. The courier will try again or contact the sender."}
          {exception === "returned" && "This shipment is being returned to the sender."}
          {exception === "cancelled" && "This shipment was cancelled by the sender."}
        </p>
      )}
    </div>
  );
}
