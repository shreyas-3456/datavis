import Link from "next/link";

const LINKS = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
  ],
  Docs: [
    { label: "Getting Started", href: "/docs" },
    { label: "API Reference", href: "/docs/api" },
    { label: "Examples", href: "/docs/examples" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-gray-800/50 pt-16 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-white font-bold">DataVis</span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              AI-powered data visualization platform for teams and analysts.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="text-white text-sm font-semibold mb-4">{group}</p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">© 2025 DataVis Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Cookies"].map((item) => (
              <Link key={item} href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}