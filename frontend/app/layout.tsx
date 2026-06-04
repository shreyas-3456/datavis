import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DataVis | AI-Powered Data Visualization Platform",
    template: "%s | DataVis",
  },
  description:
    "Upload datasets, run fast analytics, and turn raw data into interactive charts and dashboards with DataVis.",
  applicationName: "DataVis",
  keywords: [
    "DataVis",
    "data visualization",
    "AI analytics",
    "interactive dashboards",
    "dataset analysis",
    "chart builder",
    "business intelligence",
  ],
  authors: [{ name: "DataVis" }],
  creator: "DataVis",
  publisher: "DataVis",
  category: "Data Analytics",
  openGraph: {
    title: "DataVis | AI-Powered Data Visualization Platform",
    description:
      "Upload datasets, run fast analytics, and turn raw data into interactive charts and dashboards with DataVis.",
    siteName: "DataVis",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DataVis | AI-Powered Data Visualization Platform",
    description:
      "Upload datasets, run fast analytics, and turn raw data into interactive charts and dashboards with DataVis.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
