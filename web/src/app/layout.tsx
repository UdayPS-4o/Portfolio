import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://udayps.com"),
  title: {
    default: "Uday Pratap Singh — Full-Stack · RPA · Reverse Engineering",
    template: "%s — Uday Pratap Singh",
  },
  description:
    "Uday Pratap Singh Parihar — Full-Stack Developer, RPA, Automation & Reverse Engineering. Building LLM-powered products, agentic workflows, and high-throughput systems that thrive where the documentation runs out.",
  authors: [{ name: "Uday Pratap Singh Parihar" }],
  keywords: [
    "Full-Stack Developer",
    "Reverse Engineering",
    "RPA",
    "Automation",
    "LLM",
    "Agentic Workflows",
    "Indore",
  ],
  openGraph: {
    title: "Uday Pratap Singh — Full-Stack · RPA · Reverse Engineering",
    description:
      "Production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.",
    type: "website",
    locale: "en_US",
    siteName: "uday.exe",
  },
  twitter: {
    card: "summary_large_image",
    title: "Uday Pratap Singh — Full-Stack · RPA · Reverse Engineering",
    description:
      "Production features and ruthless automation: LLM-powered products, agentic workflows, high-throughput systems.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070709",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
