import Link from "next/link";
import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <MarketingNav />
      <main className="flex-1 relative z-10">{children}</main>
      <MarketingFooter />
    </div>
  );
}