"use client";
import { useParams } from "next/navigation";
import { Redirect } from "@/app-shell/guards";
import { TicketDetail } from "../components/TicketDetail";

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const id = Number(ticketId);
  if (!Number.isInteger(id) || id <= 0) return <Redirect to="/tickets" />;
  return <TicketDetail key={id} ticketId={id} />;
}
