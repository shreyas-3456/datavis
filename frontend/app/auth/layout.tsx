import { AuthLayout } from "@/components/auth/Authlayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}