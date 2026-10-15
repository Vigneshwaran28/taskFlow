"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { ListFormDialog } from "../components/ListFormDialog";
import { ListGrid } from "../components/ListGrid";
import type { TaskList } from "../services/listService";

export function ListsPage() {
  const [dialog, setDialog] = useState<{ open: boolean; list: TaskList | null; key: number }>({ open: false, list: null, key: 0 });

  const openCreate = () => setDialog(current => ({ open: true, list: null, key: current.key + 1 }));
  const openEdit = (list: TaskList) => setDialog(current => ({ open: true, list, key: current.key + 1 }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lists"
        description="Group tasks by project, client, or area."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New list
          </Button>
        }
      />
      <ListGrid onEdit={openEdit} onCreate={openCreate} />
      <ListFormDialog key={dialog.key} open={dialog.open} list={dialog.list} onClose={() => setDialog(current => ({ ...current, open: false }))} />
    </div>
  );
}
