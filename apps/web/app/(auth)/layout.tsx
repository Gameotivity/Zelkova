import { WalletProviders } from "@/lib/wallet/providers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProviders>{children}</WalletProviders>;
}
