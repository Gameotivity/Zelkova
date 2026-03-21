import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zelkora.ai — Autonomous Trading Agent Builder",
  description:
    "Build autonomous trading agents for crypto markets and prediction markets. No code required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
