"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { walletConfig } from "./config";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const zelkoraTheme = darkTheme({
  accentColor: "#00E5FF",
  accentColorForeground: "#06080E",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});

// Override specific theme values
zelkoraTheme.colors.modalBackground = "#0F1629";
zelkoraTheme.colors.modalBorder = "#1E293B";
zelkoraTheme.colors.actionButtonBorder = "#1E293B";
zelkoraTheme.colors.generalBorder = "#1E293B";
zelkoraTheme.colors.profileForeground = "#0F1629";

export function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={zelkoraTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
