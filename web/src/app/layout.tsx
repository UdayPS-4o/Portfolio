import type { Metadata } from "next";
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
  title: "Uday Pratap Singh — Engineer",
  description:
    "Uday Pratap Singh Parihar — Full-Stack Developer, RPA, Automation & Reverse Engineering. Building LLM-powered products, agentic workflows, and high-throughput systems.",
  authors: [{ name: "Uday Pratap Singh Parihar" }],
  openGraph: {
    title: "Uday Pratap Singh — Full-Stack · RPA · Reverse Engineering",
    description:
      "Full-stack developer shipping production features and building efficient automation systems.",
    type: "website",
  },
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
