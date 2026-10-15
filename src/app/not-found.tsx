import NextLink from "next/link";
import { Compass, Home, LogIn } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { StatusPage } from "@/components/shared/StatusPage";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Page not found" };

/** 404 for any address that isn't a page (workspace pages have their own, inside the app). */
export default function NotFound() {
  return (
    <StatusPage
      code="404"
      icon={Compass}
      title="We couldn't find that page"
      message={
        <p>
          The address may be mistyped, or the page has moved. If you followed a link from a colleague, ask them for the
          workspace&apos;s address (like <span className="font-mono text-foreground">/acme</span>).
        </p>
      }
      actions={
        <>
          <NextLink href="/" className={buttonClass("primary", "md")}>
            <Home className="h-4 w-4" aria-hidden="true" />
            Start page
          </NextLink>
          <BackButton />
          <NextLink href="/login?generic=1" className={buttonClass("ghost", "md")}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </NextLink>
        </>
      }
    />
  );
}
