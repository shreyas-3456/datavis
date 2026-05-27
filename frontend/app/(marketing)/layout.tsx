import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MarketingLayout>{children}</MarketingLayout>;
}