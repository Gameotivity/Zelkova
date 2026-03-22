import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
  fantom,
  gnosis,
  celo,
  zkSync,
  linea,
  scroll,
  mantle,
  blast,
} from "wagmi/chains";

// WalletConnect Cloud Project ID
// Get yours free at https://cloud.walletconnect.com
const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || "e50be373b74dc84b5d66444e57e5f42a";

export const walletConfig = getDefaultConfig({
  appName: "Zelkora.ai",
  projectId: WC_PROJECT_ID,
  chains: [
    mainnet,
    polygon,
    arbitrum,
    optimism,
    base,
    bsc,
    avalanche,
    fantom,
    gnosis,
    celo,
    zkSync,
    linea,
    scroll,
    mantle,
    blast,
  ],
  ssr: true,
});

export const SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum", symbol: "ETH", icon: "⟠", color: "#627EEA" },
  { id: 137, name: "Polygon", symbol: "MATIC", icon: "⬡", color: "#8247E5" },
  { id: 42161, name: "Arbitrum", symbol: "ETH", icon: "🔵", color: "#28A0F0" },
  { id: 10, name: "Optimism", symbol: "ETH", icon: "🔴", color: "#FF0420" },
  { id: 8453, name: "Base", symbol: "ETH", icon: "🔵", color: "#0052FF" },
  { id: 56, name: "BNB Chain", symbol: "BNB", icon: "⬡", color: "#F0B90B" },
  { id: 43114, name: "Avalanche", symbol: "AVAX", icon: "🔺", color: "#E84142" },
  { id: 250, name: "Fantom", symbol: "FTM", icon: "👻", color: "#1969FF" },
  { id: 100, name: "Gnosis", symbol: "xDAI", icon: "🦉", color: "#04795B" },
  { id: 42220, name: "Celo", symbol: "CELO", icon: "🟢", color: "#35D07F" },
  { id: 324, name: "zkSync", symbol: "ETH", icon: "⚡", color: "#8C8DFC" },
  { id: 59144, name: "Linea", symbol: "ETH", icon: "━", color: "#121212" },
  { id: 534352, name: "Scroll", symbol: "ETH", icon: "📜", color: "#FFEEDA" },
  { id: 5000, name: "Mantle", symbol: "MNT", icon: "🟩", color: "#000000" },
  { id: 81457, name: "Blast", symbol: "ETH", icon: "💥", color: "#FCFC03" },
] as const;

export function getChainInfo(chainId: number) {
  return SUPPORTED_CHAINS.find((c) => c.id === chainId);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
