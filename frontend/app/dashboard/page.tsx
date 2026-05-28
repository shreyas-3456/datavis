import { getMe } from "@/lib/actions/auth.actions";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export default async function DashboardPage() {
  const user = await getMe();
  return <DashboardHome userName={user?.full_name ?? null} />;
}
