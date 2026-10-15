import { redirect } from "next/navigation";

// Accounts are created by workspace admins; public sign-up is closed.
export default function Page() {
  redirect("/login");
}
