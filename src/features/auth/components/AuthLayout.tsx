import type { ReactNode } from "react";
import { Boxes, CalendarCheck, LifeBuoy, ReceiptText, Stethoscope, Truck } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

const HIGHLIGHTS = [
  { icon: LifeBuoy, text: "Help desk, tasks, and team messaging" },
  { icon: Boxes, text: "Inventory, sales orders, and invoicing" },
  { icon: Truck, text: "Shipments, dispatch, and live tracking" },
  { icon: Stethoscope, text: "Clinic appointments and patient records" },
  { icon: CalendarCheck, text: "Attendance, leave, and holiday calendars" },
  { icon: ReceiptText, text: "Expenses with approvals and payouts" },
];

/** Split layout for sign-in, password, and setup screens. */
export function AuthLayout({ title, subtitle, children, wide = false }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo inverted />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">One workspace for how your organisation runs.</h2>
          <ul className="mt-8 flex flex-col gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-indigo-100">
                <span className="rounded-lg bg-white/10 p-2">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Each workspace gets only the modules it needs.</p>
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className={wide ? "w-full max-w-xl" : "w-full max-w-sm"}>
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
