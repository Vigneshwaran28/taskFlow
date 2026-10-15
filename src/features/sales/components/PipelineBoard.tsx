"use client";
import { useMemo, useState, type DragEvent } from "react";
import { CalendarClock, Check, GripVertical, Plus, RotateCcw, Search, ShoppingCart, Target, X } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatCompact, formatDay, formatMoney, localDay } from "@/lib/format";
import { useCan, useCurrentUser } from "@/features/auth";
import { useDeals, useUpdateDeal } from "../hooks/useSales";
import type { Deal, DealStage } from "../services/salesService";
import { DEAL_STAGES, toOptions } from "../utils/salesMeta";
import { DealFormDialog } from "./DealFormDialog";
import { OrderEditorDialog } from "./OrderEditorDialog";

const STAGE_OPTIONS = toOptions(DEAL_STAGES);
const STAGES = Object.keys(DEAL_STAGES) as DealStage[];

/** How likely an open deal at each stage is to close, for the weighted forecast. */
const WIN_CHANCE: Record<DealStage, number> = { lead: 0.1, qualified: 0.25, proposal: 0.5, negotiation: 0.75, won: 1, lost: 0 };

type SortKey = "close" | "value" | "updated";
const SORTS: { value: SortKey; label: string }[] = [
  { value: "close", label: "Closing soonest" },
  { value: "value", label: "Highest value" },
  { value: "updated", label: "Recently updated" },
];

const sorters: Record<SortKey, (a: Deal, b: Deal) => number> = {
  close: (a, b) => (a.expectedClose ?? "9999").localeCompare(b.expectedClose ?? "9999"),
  value: (a, b) => b.value - a.value,
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

const isOverdue = (deal: Deal) => Boolean(DEAL_STAGES[deal.stage].open && deal.expectedClose && deal.expectedClose < localDay());

interface DealCardProps {
  deal: Deal;
  onOpen: () => void;
  onMove: (stage: DealStage) => void;
  onCreateOrder: () => void;
  disabled: boolean;
  /** Can change the stage (sales.edit) */
  canMove: boolean;
  dragging: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}

const iconButton =
  "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/** Presentational: one deal card. Drag it to another column, or use the stage picker and quick actions (keyboard and touch). */
function DealCard({ deal, onOpen, onMove, onCreateOrder, disabled, canMove, dragging, onDragStart, onDragEnd }: DealCardProps) {
  const overdue = isOverdue(deal);
  const open = DEAL_STAGES[deal.stage].open;
  return (
    <li
      draggable={canMove && !disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn("group flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-opacity", canMove && "cursor-grab active:cursor-grabbing", dragging && "opacity-40")}
    >
      <div className="flex items-start gap-1.5">
        {canMove && <GripVertical className="mt-0.5 hidden h-4 w-4 shrink-0 text-muted-foreground/60 sm:block" aria-hidden="true" />}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="block truncate font-medium leading-snug hover:underline">{deal.title}</span>
          {deal.customer && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{deal.customer.company ?? deal.customer.name}</span>}
        </button>
        {deal.owner && (
          <span title={`Owner: ${deal.owner.name}`} className="shrink-0">
            <Avatar name={deal.owner.name} size="sm" />
            <span className="sr-only">Owner: {deal.owner.name}</span>
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-sm font-semibold tabular-nums">{formatMoney(deal.value)}</span>
        {deal.expectedClose && (
          <span className={cn("flex items-center gap-1 text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {overdue ? "Overdue " : ""}
            {formatDay(deal.expectedClose)}
          </span>
        )}
      </div>
      {canMove && (
        <div className="flex flex-wrap items-center gap-1.5">
          {open ? (
            <>
              <button type="button" disabled={disabled} onClick={() => onMove("won")} className={cn(iconButton, "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300")}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Won
              </button>
              <button type="button" disabled={disabled} onClick={() => onMove("lost")} className={cn(iconButton, "border-destructive/40 text-destructive hover:bg-destructive/10")}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Lost
              </button>
            </>
          ) : deal.stage === "won" ? (
            <button type="button" onClick={onCreateOrder} className={cn(iconButton, "hover:bg-muted")}>
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              Create order
            </button>
          ) : (
            <button type="button" disabled={disabled} onClick={() => onMove("qualified")} className={cn(iconButton, "hover:bg-muted")}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reopen
            </button>
          )}
          <label className="sr-only" htmlFor={`deal-stage-${deal.id}`}>
            Move {deal.title} to stage
          </label>
          <select
            id={`deal-stage-${deal.id}`}
            value={deal.stage}
            disabled={disabled}
            onChange={event => onMove(event.target.value as DealStage)}
            className="ml-auto h-7 min-w-0 max-w-30 rounded-md border border-input bg-background px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STAGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </li>
  );
}

interface DialogState {
  key: number;
  deal: Deal | null;
  stage?: DealStage;
}

/**
 * Feature component: deals in columns by stage. Each column scrolls on its own (the page doesn't grow with the
 * pipeline); cards move by drag and drop, the stage picker, or the Won / Lost buttons; won deals turn into orders.
 */
export function PipelineBoard() {
  const toast = useToast();
  const { data: me } = useCurrentUser();
  const { data: deals, isPending, error, refetch } = useDeals();
  const updateDeal = useUpdateDeal();
  const canEdit = useCan("sales.edit");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [orderFrom, setOrderFrom] = useState<Deal | null>(null);
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("close");
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropStage, setDropStage] = useState<DealStage | null>(null);

  const term = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      (deals ?? []).filter(
        deal =>
          (!mine || deal.owner?.id === me?.id) &&
          (!overdueOnly || isOverdue(deal)) &&
          (!term || deal.title.toLowerCase().includes(term) || (deal.customer?.company ?? deal.customer?.name ?? "").toLowerCase().includes(term))
      ),
    [deals, mine, overdueOnly, term, me?.id]
  );

  if (isPending) return <LoadingState label="Loading pipeline…" />;
  if (error) return <ErrorState message="Unable to load deals." onRetry={() => void refetch()} />;

  function move(deal: Deal, stage: DealStage) {
    if (deal.stage === stage) return;
    updateDeal.mutate(
      { id: deal.id, changes: { stage } },
      {
        onSuccess: () => toast.success(`Moved to ${DEAL_STAGES[stage].label}`, deal.title),
        onError: err => toast.error("Couldn't move the deal", err.message),
      }
    );
  }

  function handleDrop(event: DragEvent, stage: DealStage) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/plain")) || dragId;
    const deal = deals?.find(item => item.id === id);
    setDragId(null);
    setDropStage(null);
    if (deal) move(deal, stage);
  }

  // The key only has to change between openings so the form starts fresh.
  const openDialog = (deal: Deal | null, stage?: DealStage) => setDialog(current => ({ key: (current?.key ?? 0) + 1, deal, stage }));
  const openNew = (stage: DealStage) => openDialog(null, stage);

  const open = visible.filter(deal => DEAL_STAGES[deal.stage].open);
  const openValue = open.reduce((sum, deal) => sum + deal.value, 0);
  const weighted = open.reduce((sum, deal) => sum + deal.value * WIN_CHANCE[deal.stage], 0);
  const filtered = visible.length !== deals.length;

  return (
    <div className="flex flex-col gap-3">
      {!deals.length ? (
        <EmptyState
          title="No deals yet"
          message="Add the opportunities you're working on and move them through the stages to closing."
          icon={Target}
          action={
            canEdit ? (
              <Button onClick={() => openNew("lead")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New deal
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-card px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Search deals</span>
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search deals or customers"
                className="h-9 min-w-0 flex-1 bg-transparent text-sm focus-visible:outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-pressed={mine} onClick={() => setMine(value => !value)} className={cn(iconButton, "h-9 px-3", mine ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted")}>
                My deals
              </button>
              <button
                type="button"
                aria-pressed={overdueOnly}
                onClick={() => setOverdueOnly(value => !value)}
                className={cn(iconButton, "h-9 px-3", overdueOnly ? "border-destructive bg-destructive/10 text-destructive" : "bg-card hover:bg-muted")}
              >
                Overdue
              </button>
              <label className="sr-only" htmlFor="pipeline-sort">
                Sort deals
              </label>
              <select
                id="pipeline-sort"
                value={sort}
                onChange={event => setSort(event.target.value as SortKey)}
                className="h-9 rounded-lg border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SORTS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {canEdit && (
                <Button size="sm" className="h-9" onClick={() => openNew("lead")}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New deal
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground" role="status">
            {filtered ? `${visible.length} of ${deals.length} deals · ` : ""}
            Open <span className="font-medium tabular-nums text-foreground">{formatMoney(openValue)}</span> · Weighted forecast{" "}
            <span className="font-medium tabular-nums text-foreground" title="Open value × chance of closing at each stage">
              {formatMoney(weighted)}
            </span>
            {canEdit && <span className="hidden sm:inline"> · Drag cards between columns to move them</span>}
          </p>

          <div className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-3 sm:mx-0 sm:snap-none sm:px-0">
            <div className="flex gap-3">
              {STAGES.map(stage => {
                const meta = DEAL_STAGES[stage];
                const column = visible.filter(deal => deal.stage === stage).sort(sorters[sort]);
                const total = column.reduce((sum, deal) => sum + deal.value, 0);
                const isTarget = dropStage === stage && dragId !== null;
                return (
                  <section
                    key={stage}
                    aria-labelledby={`stage-${stage}`}
                    onDragOver={event => {
                      if (dragId === null) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      if (dropStage !== stage) setDropStage(stage);
                    }}
                    onDragLeave={event => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropStage(null);
                    }}
                    onDrop={event => handleDrop(event, stage)}
                    className={cn(
                      "flex w-[82vw] shrink-0 snap-start flex-col rounded-xl bg-muted/50 p-2 transition-colors sm:w-64 xl:w-auto xl:min-w-52 xl:flex-1",
                      isTarget && "bg-accent ring-2 ring-primary/60"
                    )}
                  >
                    <header className="flex items-center justify-between gap-2 px-1 pb-2 pt-1">
                      <h3 id={`stage-${stage}`} className="flex items-center gap-2 text-sm font-semibold">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="text-xs font-normal tabular-nums text-muted-foreground">{column.length}</span>
                      </h3>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground" title={formatMoney(total)}>
                        {formatCompact(total)}
                      </span>
                    </header>
                    {/* The column scrolls, not the page: long pipelines stay within the screen. */}
                    <ul className="flex max-h-[calc(100dvh-22rem)] min-h-24 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]">
                      {column.map(deal => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          disabled={updateDeal.isPending}
                          canMove={canEdit}
                          dragging={dragId === deal.id}
                          onDragStart={event => {
                            event.dataTransfer.setData("text/plain", String(deal.id));
                            event.dataTransfer.effectAllowed = "move";
                            setDragId(deal.id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setDropStage(null);
                          }}
                          onOpen={() => openDialog(deal)}
                          onMove={next => move(deal, next)}
                          onCreateOrder={() => setOrderFrom(deal)}
                        />
                      ))}
                      {!column.length && <li className="rounded-lg border border-dashed px-2 py-6 text-center text-xs text-muted-foreground">{isTarget ? "Drop here" : "No deals"}</li>}
                    </ul>
                    {meta.open && canEdit && (
                      <button
                        type="button"
                        onClick={() => openNew(stage)}
                        className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 py-2 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Add deal
                      </button>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}
      {dialog && <DealFormDialog key={dialog.key} deal={dialog.deal} defaultStage={dialog.stage} onClose={() => setDialog(null)} />}
      {orderFrom && (
        <OrderEditorDialog
          prefill={{ customerId: orderFrom.customer?.id ?? null, notes: `From deal: ${orderFrom.title}`, lines: [{ description: orderFrom.title, quantity: 1, unitPrice: orderFrom.value }] }}
          onClose={() => setOrderFrom(null)}
          onSaved={() => toast.success("Order created", "Find it under Orders.")}
        />
      )}
    </div>
  );
}
