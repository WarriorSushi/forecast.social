import { requireAdmin } from "@/lib/admin";

/**
 * Admin route group. Every page under (app)/admin/* runs through this
 * server layout, which guards on the user's is_admin flag and redirects
 * non-admins to /feed.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
