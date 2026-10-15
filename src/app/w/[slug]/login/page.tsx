import { redirect } from "next/navigation";

/** Older links (/w/<slug>/login) move to /<slug>/login. */
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ slug }, { from }] = await Promise.all([params, searchParams]);
  redirect(`/${encodeURIComponent(slug)}/login${from ? `?from=${encodeURIComponent(from)}` : ""}`);
}
