// Old app links without a workspace address (/billing/12, bookmarks from before workspace URLs) are sent to
// /<workspace>/billing/12 using the workspace this browser signed in to (the tf_ws cookie), or to sign-in.
import { NextResponse, type NextRequest } from "next/server";
import { APP_SECTIONS } from "@/lib/tenantPath";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (!APP_SECTIONS.has(first)) return NextResponse.next();
  const workspace = request.cookies.get("tf_ws")?.value;
  const url = request.nextUrl.clone();
  if (workspace && /^[a-z0-9][a-z0-9-]{0,59}$/.test(workspace)) {
    url.pathname = `/${workspace}${pathname}`;
  } else {
    url.pathname = "/login";
    url.search = `?from=${encodeURIComponent(pathname + search)}`;
  }
  return NextResponse.redirect(url);
}

export const config = {
  // Only page navigations: never API calls, Next internals, or files.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
