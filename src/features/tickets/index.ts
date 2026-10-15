// Public API of the help desk feature.
export { TicketsPage } from "./pages/TicketsPage";
export { TicketDetailPage } from "./pages/TicketDetailPage";
export { useTicketStats, ticketKeys } from "./hooks/useTickets";
export { HelpdeskStats } from "./components/HelpdeskStats";
export { TicketToasts } from "./components/TicketToasts";
export type { Ticket, TicketDetail, TicketStats, StaffTicketStats, MemberTicketStats, TicketStatus, TicketPriority } from "./services/ticketService";
