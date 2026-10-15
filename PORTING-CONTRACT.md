# Porting contract (for the parallel port from ../client)

Every feature's `index.ts` must export at least these names. The app shell and other features rely on them, with the same semantics as the old client.

| Feature | Required exports |
|---|---|
| auth (done) | see `src/features/auth/index.ts` |
| admin | `AdminLoginPage`, `AdminDashboardPage`, `RequireAdmin` ({ guestOnly?: boolean; children }), `useAdminSession`, `adminKeys` (`adminKeys.session = ["admin", "session"]`) |
| setup | `SetupPage`, `useSetupStatus(options?: { enabled?: boolean })` → query of `{ configured: boolean; client: string \| null }`, `setupKeys` |
| tasks | `TasksPage`, `CalendarPage`, `TaskDialogProvider`, `useTaskDialog()` → `{ openCreate(defaults?), openEditById(id: number) }` (+ old extras), `TaskRow`, `PriorityBadge`, `QuickAddTask`, `useToggleTask`, `taskKeys`, `taskService`, `TASK_VIEWS: Record<string, { label: string; icon: ComponentType<{ className?: string }> }>`, `PRIORITY_OPTIONS` |
| lists | `ListsPage`, `useLists()` → query of `{ id: number; name: string; color: string; openCount: number }[]`, `listKeys`, `colorFor(color: string)` → `{ dot: string; soft: string; … }`, `LIST_COLORS` |
| notifications | `NotificationBell` props `{ onOpenTask: (id: number) => void; onOpenTicket: (id: number) => void }` |
| messaging | `MessagesPage`, `useUnreadMessages()` → query of `{ total: number; … }`, `messagingKeys` |
| announcements | `AnnouncementsPage`, `LatestAnnouncements`, `useAnnouncements()` → query whose data has `unread: number`, `announcementKeys` |
| tickets | `TicketsPage`, `TicketDetailPage`, `useTicketStats()` → query of `{ staff: boolean; assignedToMe: number; unassigned: number; myOpen: number; … }`, `ticketKeys`, `HelpdeskStats` |
| teams | `TeamsPage`, `useTeams`, `teamKeys` |
| people | `PeoplePage`, `usePeople`, `useCelebrations`, `peopleKeys`, `Celebrations` |
| attendance | `AttendancePage`, `TodayCard` ({ compact?: boolean }), `AutoAttendance` ({ userId: number }), `attendanceKeys`, `useHolidays(year: number, options?: { enabled?: boolean })`, `HOLIDAY_TYPES` |
| inventory | `InventoryPage`, `ProductPage`, `InventoryOverview`, `useProducts`, `inventoryKeys` |
| sales | `SalesPage`, `SalesOverview`, `salesKeys` |
| expenses | `ExpensesPage`, `expenseKeys` |
| dashboard | `DashboardPage` |
| settings | `SettingsPage` |
| users | `UsersPage`, `useManagedUsers`, `userKeys` |
| access | `RolesPage`, `AuditPage`, `useRoles`, `accessKeys` |
| workspace | `ModuleSettingsEditor`, `CONFIGURABLE_MODULES`, `WORKSPACE_SETTINGS`, `ModuleSettingsPanel` |
| billing (new) | `BillingPage`, `BillingDocumentPage`, `BillingOverview` (home widget, no props), `billingKeys` |
| logistics (new) | `LogisticsPage`, `ShipmentPage`, `LogisticsOverview` (home widget, no props), `TrackingPage` (public), `TrackingLookupPage` (public form), `logisticsKeys` |
| clinic (new) | `ClinicPage`, `PatientPage`, `ClinicOverview` (home widget, no props), `clinicKeys` |

## Route ownership (`src/app/`)
- tasks/home: `(workspace)/page.tsx`, `(workspace)/tasks/page.tsx` (→ /tasks/today), `(workspace)/tasks/[view]`, `(workspace)/lists`, `(workspace)/lists/[listId]`, `(workspace)/calendar`, `(workspace)/people`
- collaboration: `(workspace)/tickets`, `(workspace)/tickets/[ticketId]`, `(workspace)/teams`, `(workspace)/messages`, `(workspace)/messages/[conversationId]`, `(workspace)/announcements`
- operations/HR: `(workspace)/inventory`, `(workspace)/inventory/[productId]`, `(workspace)/sales`, `(workspace)/expenses`, `(workspace)/attendance`
- console/setup: `setup`, `admin`, `admin/login`
- workspace admin: `(workspace)/settings`, `(workspace)/users`, `(workspace)/roles`, `(workspace)/audit`
- billing: `(workspace)/billing`, `(workspace)/billing/[documentId]`
- logistics: `(workspace)/logistics`, `(workspace)/logistics/[shipmentId]`, `track`, `track/[code]`
- clinic: `(workspace)/clinic`, `(workspace)/clinic/patients/[patientId]`, `clinic-display` (TV board, signed in, no shell), `q/[code]` (public token page)
