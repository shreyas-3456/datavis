"use client";

import Link from "next/link";
import { AnimateIn } from "@/components/marketing/AnimateIn";
import { useState } from "react";

const PLANS = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Perfect for personal projects and exploring DataVis.",
    color: "border-gray-800",
    badge: null,
    cta: "Get started",
    ctaStyle: "border border-gray-700 hover:border-gray-500 text-white",
    features: [
      "3 datasets",
      "5 dashboards",
      "100MB file size limit",
      "Basic chart types",
      "7-day data retention",
      "Community support",
    ],
    missing: ["AI queries", "SQL editor", "Custom branding", "API access"],
  },
  {
    name: "Pro",
    price: { monthly: 29, annual: 23 },
    description: "For analysts and individuals doing serious data work.",
    color: "border-indigo-500/50",
    badge: "Most popular",
    cta: "Start free trial",
    ctaStyle: "bg-indigo-600 hover:bg-indigo-500 text-white",
    features: [
      "Unlimited datasets",
      "Unlimited dashboards",
      "1GB file size limit",
      "All 8 chart types",
      "90-day data retention",
      "50 AI queries / month",
      "Full SQL editor",
      "Priority support",
      "Shareable dashboards",
    ],
    missing: ["Custom branding", "SSO / SAML"],
  },
  {
    name: "Team",
    price: { monthly: 79, annual: 63 },
    description: "For teams that collaborate on data and share insights.",
    color: "border-gray-800",
    badge: null,
    cta: "Start free trial",
    ctaStyle: "border border-gray-700 hover:border-gray-500 text-white",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "5GB file size limit",
      "Unlimited AI queries",
      "1-year data retention",
      "Role-based access",
      "Team dashboards",
      "Custom branding",
      "Slack integration",
      "Priority support",
    ],
    missing: ["SSO / SAML"],
  },
  {
    name: "Enterprise",
    price: { monthly: null, annual: null },
    description: "Custom pricing for large organizations with advanced needs.",
    color: "border-gray-800",
    badge: null,
    cta: "Contact sales",
    ctaStyle: "border border-gray-700 hover:border-gray-500 text-white",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "Unlimited file size",
      "Unlimited AI queries",
      "Unlimited data retention",
      "SSO / SAML",
      "Custom integrations",
      "SLA guarantee",
      "Dedicated support",
      "On-premise option",
    ],
    missing: [],
  },
];

const FAQS = [
  { q: "Can I change plans later?", a: "Yes, upgrade or downgrade at any time. Changes take effect immediately and billing is prorated." },
  { q: "What happens when I hit my dataset limit?", a: "You'll be prompted to upgrade or delete existing datasets. We never delete your data without warning." },
  { q: "Is there a free trial?", a: "Pro and Team plans come with a 14-day free trial. No credit card required to start." },
  { q: "What file formats do you support?", a: "CSV, Excel (.xlsx, .xls), and JSON. More formats coming soon." },
  { q: "Can I export my data?", a: "Yes, export any dataset or chart at any time in CSV, JSON, or PNG/SVG formats." },
  { q: "Do you offer discounts for startups or students?", a: "Yes — reach out to us at billing@datavis.io with proof of eligibility for 50% off." },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="font-body min-h-screen pt-32 pb-24 px-6 overflow-hidden">
      <style>{`
        @keyframes pricePop {
          0%   { transform: scale(.8); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1);   opacity: 1; }
        }
        .price-pop { animation: pricePop .3s ease-out forwards; }
        .plan-card { transition: transform .3s ease, box-shadow .3s ease; }
        .plan-card:hover { transform: translateY(-6px); }
        .plan-featured { box-shadow: 0 0 0 1px rgba(99,102,241,.5), 0 30px 80px rgba(99,102,241,.15); }
        .faq-answer { overflow: hidden; transition: max-height .3s ease, opacity .3s ease; }
        .toggle-pill { transition: background .2s ease; }
      `}</style>

      {/* Bg orb */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[700px] h-[700px] rounded-full" style={{ background:"radial-gradient(circle,rgba(79,70,229,.1) 0%,transparent 70%)",top:"-5%",left:"50%",transform:"translateX(-50%)" }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header */}
        <div className="text-center mb-16">
          <AnimateIn direction="none">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              Simple, transparent pricing
            </div>
          </AnimateIn>

          <AnimateIn delay={100}>
            <h1 className="font-display text-6xl md:text-7xl font-bold text-white mb-5 leading-[.95] tracking-tight">
              Pay for what<br />
              <span className="shimmer-text">you actually use</span>
            </h1>
          </AnimateIn>

          <AnimateIn delay={200}>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
              Start free. Upgrade when you need more.
              No hidden fees, no surprise charges.
            </p>
          </AnimateIn>

          {/* Billing toggle */}
          <AnimateIn delay={300}>
            <div className="inline-flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-full p-1.5">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${!annual ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${annual ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Annual
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">−20%</span>
              </button>
            </div>
          </AnimateIn>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-24">
          {PLANS.map((plan, i) => (
            <AnimateIn key={plan.name} delay={i * 80} direction="up">
              <div className={`plan-card relative bg-gray-900 border rounded-2xl p-6 flex flex-col h-full ${plan.color} ${plan.badge ? "plan-featured" : ""}`}>

                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-display text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{plan.description}</p>
                </div>

                <div className="mb-6">
                  {plan.price.monthly !== null ? (
                    <div key={annual ? "annual" : "monthly"} className="price-pop">
                      <span className="font-display text-4xl font-bold text-white">
                        ${annual ? plan.price.annual : plan.price.monthly}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">/mo</span>
                      {annual && plan.price.monthly > 0 && (
                        <div className="text-green-400 text-xs mt-1">
                          Save ${(plan.price.monthly - plan.price.annual!) * 12}/yr
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="font-display text-3xl font-bold text-white">Custom</div>
                  )}
                </div>

                <Link
                  href={plan.name === "Enterprise" ? "/contact" : "/auth/signup"}
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 mb-6 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>
          ))}
        </div>

        {/* Feature comparison ticker */}
        <AnimateIn>
          <div className="mb-24 overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40">
            <div className="flex gap-0" style={{ animation:"ticker 20s linear infinite" }}>
              {[...Array(2)].map((_, di) => (
                <div key={di} className="flex items-center gap-8 px-8 py-4 shrink-0">
                  {["DuckDB analytics","AI-powered queries","8 chart types","Drag & drop upload","Role-based access","Shareable dashboards","Background processing","Schema detection"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
                      <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* FAQ */}
        <AnimateIn>
          <div className="mb-24">
            <h2 className="font-display text-4xl font-bold text-white text-center mb-12">
              Frequently asked questions
            </h2>
            <div className="max-w-2xl mx-auto space-y-3">
              {FAQS.map((faq, i) => (
                <AnimateIn key={i} delay={i * 50}>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left"
                    >
                      <span className="text-white font-medium text-sm">{faq.q}</span>
                      <svg
                        className={`w-4 h-4 text-gray-500 shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className="faq-answer"
                      style={{ maxHeight: openFaq === i ? "200px" : "0", opacity: openFaq === i ? 1 : 0 }}
                    >
                      <p className="px-6 pb-5 text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* CTA */}
        <AnimateIn>
          <div className="relative bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background:"radial-gradient(circle at 50% 0%,rgba(99,102,241,.15) 0%,transparent 60%)" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20" style={{ background:"linear-gradient(to bottom,#4f46e5,transparent)" }} />
            <h2 className="font-display text-4xl font-bold text-white mb-3 relative">Start building today</h2>
            <p className="text-gray-500 text-sm mb-8 relative">14-day free trial on paid plans. No credit card required.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap relative">
              <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors duration-200">
                Get started free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                Talk to sales →
              </Link>
            </div>
          </div>
        </AnimateIn>

      </div>
    </div>
  );
}