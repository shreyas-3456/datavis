import { redirect } from "next/navigation";
import { getMe } from "@/lib/actions/auth.actions";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Providers } from "@/app/providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getMe();

  if (!user) {
    redirect("/auth/login");
  }

  return <Providers>
    <DashboardShell user={user}>{children}</DashboardShell>
  </Providers>
}