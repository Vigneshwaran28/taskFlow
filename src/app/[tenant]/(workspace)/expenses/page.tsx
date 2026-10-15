"use client";
import { RequireFeature } from "@/app-shell/guards";
import { ExpensesPage } from "@/features/expenses";

export default function Page() {
  return (
    <RequireFeature feature="expenses">
      <ExpensesPage />
    </RequireFeature>
  );
}
