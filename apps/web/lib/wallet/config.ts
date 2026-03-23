import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, mainnet, base, optimism, polygon } from "wagmi/chains";
import { http } from "wagmi";

// WalletConnect Cloud Project ID
// Get yours free at https://cloud.walletconnect.com
const WC_PROJECT_ID =
  (process.env.NEXT_PUBLIC_WC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694").trim();

export const walletConfig = getDefaultConfig({
  appName: "Zelkora.ai",
  projectId: WC_PROJECT_ID,
  // Arbitrum first — Hyperliquid uses Arbitrum for signing
  chains: [arbitrum, mainnet, base, optimism, polygon],
  transports: {
    [arbitrum.id]: http(),
    [mainnet.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
  ssr: true,
});

export const SUPPORTED_CHAINS = [
  { id: 42161, name: "Arbitrum", symbol: "ETH", icon: "🔵", color: "#28A0F0" },
  { id: 1, name: "Ethereum", symbol: "ETH", icon: "⟠", color: "#627EEA" },
  { id: 8453, name: "Base", symbol: "ETH", icon: "🔵", color: "#0052FF" },
  { id: 10, name: "Optimism", symbol: "ETH", icon: "🔴", color: "#FF0420" },
  { id: 137, name: "Polygon", symbol: "MATIC", icon: "⬡", color: "#8247E5" },
] as const;

export function getChainInfo(chainId: number) {
  return SUPPORTED_CHAINS.find((c) => c.id === chainId);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
