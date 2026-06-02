import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Portfolio admin dashboard",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070709",
        color: "#ededf0",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        cursor: "default",
      }}
    >
      {children}
    </div>
  );
}
