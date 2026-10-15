# TaskFlow Web (Next.js + TypeScript)

The web app for TaskFlow. It replaces the Vite client in `../client` and uses the same Express API in `../server` (unchanged database).

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict), **Tailwind CSS 4**, **TanStack Query 5**, **lucide-react**.
- `next.config.ts` proxies `/api/*` to the API (`TASKFLOW_API_ORIGIN`, default `http://localhost:4000`), so the browser sees one origin and the session cookie just works.

```bash
npm install
npm run dev        # http://localhost:3000 (start the API first: cd ../server && npm run dev)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (next/core-web-vitals + next/typescript)
npm run build && npm start
```

## Layout

```
src/
  app/                    Routes only. Each page.tsx renders a feature page inside a guard.
    layout.tsx            <html>, theme boot script, <Providers>
    providers.tsx         Query cache, theme, toasts, 401 handling, setup gate
    (workspace)/          Signed-in area: RequireAuth + AppLayout (sidebar, top bar)
    [tenant]/             Workspace URLs: /<slug>/login, /<slug>/(workspace)/... (signed in), /<slug>/clinic-display
    login/ setup/ bunny/  Outside any workspace (bunny = the provider console)
    q/ track/ reset-password/  Public pages (no sign-in)
    track/[code]/         Public shipment tracking (no sign-in)
  app-shell/              AppLayout, Sidebar, Topbar, ThemeSync, guards, modules registry
  components/ui/          Button, Dialog, TextField, SelectField, TextAreaField, Badge, Pagination, Tabs, FieldShell
  components/shared/      States (EmptyState, ErrorState, LoadingState, FullPageError, FormAlert), Avatar, ConfirmDialog,
                          PageHeader, StatCard, Toaster (useToast), Logo
  hooks/                  useTheme, useDebounce
  lib/                    apiClient (ApiError, fieldErrorsOf, formErrorOf), format, dates, navigation, cn, queryClient
  types/session.ts        SessionUser, WorkspaceSettings, FeatureKey, Page<T>, PersonRef
  features/<name>/        One folder per module
    services/             API calls + the TypeScript types of what the API returns
    hooks/                TanStack Query hooks (query keys, invalidation)
    components/           UI
    pages/                The page component a route renders
    utils/                Display metadata, pure helpers
    index.ts              The feature's public API: other code imports only from here
```

## Rules

- **Layering**: route `page.tsx` → feature page → components → hooks → services → `apiClient`. Components never call services directly; other features are imported only through their `index.ts`.
- **Types**: strict TypeScript, no `any`. API response types live next to the service that fetches them. Shared session/settings types are in `types/session.ts`.
- **Routing**: import `Link` from `@/components/navigation/Link` and `useRouter` / `usePathname` from `@/lib/navigation` (never from next/link or next/navigation): they add and strip the workspace prefix, so code keeps writing app paths like `/billing/12`. `src/proxy.ts` redirects old un-prefixed links into the remembered workspace (`tf_ws` cookie). `useParams` still comes from next/navigation. Query-string state uses `useSearchParamsState()` / `useSearchParam()` from `lib/navigation.ts`. Route params are read in feature pages with `useParams<{ id: string }>()`.
- **Client components**: route `page.tsx` files start with `"use client"`; everything they import runs on the client. The session is cookie-based and only the browser has it, so pages render client-side behind guards.
- **Guards** (`app-shell/guards.tsx`): `RequireFeature feature="billing"` (licensed module + any of its permissions), `RequirePermission permissions={[...]}`, `GuestOnly`, `Redirect`.
- **Forms**: `fieldErrorsOf(mutation.error)` for 422 field errors, `<FormAlert message={formErrorOf(mutation.error)} />` for the rest.
- **Money and dates**: `formatMoney` uses the workspace currency (`settings.company.currency`); calendar days are `YYYY-MM-DD` strings (`localDay()`, `formatDay`, `formatDate`).
- **Accessibility**: labelled controls, `aria-*` on custom widgets, keyboard support, visible focus rings (`focus-visible:ring-2 focus-visible:ring-ring`), colour tokens from `globals.css` (works in light/dark and every accent).
- **Printing**: `.no-print` hides chrome; invoices and prescriptions print cleanly.

## API references
See `../docs/api/` (billing, logistics, clinic) and the routers in `../server/src/routes/`.
