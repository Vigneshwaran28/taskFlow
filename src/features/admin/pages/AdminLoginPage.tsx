"use client";
import Link from "@/components/navigation/Link";
import { useRouter, useSearchParamsState } from "@/lib/navigation";
import { AuthLayout } from "@/features/auth";
import { AdminLoginForm } from "../components/AdminLoginForm";

export function AdminLoginPage() {
  const router = useRouter();
  const [searchParams] = useSearchParamsState();
  const from = searchParams.get("from");
  const target = from && from.startsWith("/bunny") ? from : "/bunny";

  return (
    <AuthLayout title="Admin console" subtitle="Sign in with the admin account to view every table and user.">
      <AdminLoginForm onSuccess={() => router.replace(target)} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Not an admin?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Go to the regular sign-in
        </Link>
      </p>
    </AuthLayout>
  );
}
