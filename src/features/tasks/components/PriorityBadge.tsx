import { Flag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { TaskPriority } from "../services/taskService";
import { PRIORITIES } from "../utils/taskMeta";

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const meta = PRIORITIES[priority] ?? PRIORITIES.medium;
  return (
    <Badge tone={meta.tone}>
      <Flag className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
