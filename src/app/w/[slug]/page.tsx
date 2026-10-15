import { redirect } from "next/navigation";

/** Older links (/w/<slug>) open the workspace's sign-in page at its current address. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/${encodeURIComponent(slug)}/login`);
}
