import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zelkora.ai — AI Trading on Hyperliquid",
  description:
    "7-layer AI trading desk powered by Claude. 4 analyst agents, adversarial debate, stat arb engine — executing on Hyperliquid DEX. Non-custodial.",
  metadataBase: new URL("https://zelkora.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Zelkora.ai — AI Trading on Hyperliquid",
    description: "7-layer AI trading desk. 4 analyst agents, adversarial debate, stat arb engine — executing on Hyperliquid DEX. Non-custodial.",
    url: "https://zelkora.ai",
    siteName: "Zelkora.ai",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Zelkora.ai — AI Trading on Hyperliquid" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zelkora.ai — AI Trading on Hyperliquid",
    description: "7-layer AI trading desk. Non-custodial. Performance-based pricing.",
    images: ["/og-image.png"],
  },
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
