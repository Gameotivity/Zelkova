"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletAuth } from "@/lib/wallet/use-wallet-auth";
import { getChainInfo, SUPPORTED_CHAINS } from "@/lib/wallet/config";

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    isConnected,
    isAuthenticating,
    error,
    address,
    chainId,
    balance,
    authenticate,
  } = useWalletAuth();

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !user && !isAuthenticating) {
      authenticate().then((success) => {
        if (success) router.push("/dashboard");
      });
    }
  }, [isConnected, address, user, isAuthenticating, authenticate, router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  const chain = chainId ? getChainInfo(chainId) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06080E] px-4">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#00E5FF]/5 blur-[120px]" />
        <div className="absolute right-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-[#8B5CF6]/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block text-4xl font-black tracking-tight">
            <span className="text-[#00E5FF]">Zelkora</span>
            <span className="text-[#94A3B8]">.ai</span>
          </Link>
          <p className="mt-3 text-[#94A3B8]">Connect your wallet to start trading</p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-8 shadow-2xl shadow-[#00E5FF]/5">
          {error && (
            <div className="mb-6 rounded-xl border border-[#F43F5E]/20 bg-[#F43F5E]/10 px-4 py-3 text-sm text-[#F43F5E]">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-6">
            {!isConnected ? (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00E5FF]/20 to-[#8B5CF6]/20 border border-[#00E5FF]/20">
                  <svg className="h-10 w-10 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                  </svg>
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-[#F8FAFC]">Connect Wallet</h2>
                  <p className="mt-2 text-sm text-[#94A3B8]">
                    MetaMask, WalletConnect, Coinbase, Rainbow & more
                  </p>
                </div>
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button onClick={openConnectModal}
                      className="w-full rounded-xl bg-[#00E5FF] py-3.5 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25 active:scale-[0.98]">
                      Connect Wallet
                    </button>
                  )}
                </ConnectButton.Custom>
              </>
            ) : (
              <>
                <div className="w-full rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00E5FF]/20 text-lg">
                      {chain?.icon || "⟠"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium text-[#F8FAFC]">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {chain?.name || "Unknown"} · {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "..."}
                      </p>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full bg-[#10B981] animate-pulse" />
                  </div>
                </div>

                {isAuthenticating ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E293B] border-t-[#00E5FF]" />
                    <p className="text-sm text-[#94A3B8]">Sign the message in your wallet...</p>
                    <p className="text-xs text-[#475569]">This verifies ownership — no gas fees.</p>
                  </div>
                ) : (
                  <button onClick={() => authenticate().then((s) => s && router.push("/dashboard"))}
                    className="w-full rounded-xl bg-[#00E5FF] py-3.5 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25 active:scale-[0.98]">
                    Sign In with Wallet
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mt-8 border-t border-[#1E293B] pt-6">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-[#475569]">
              Supported Networks
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUPPORTED_CHAINS.slice(0, 8).map((c) => (
                <span key={c.id} className="flex items-center gap-1 rounded-lg bg-[#1A2340] px-2.5 py-1 text-xs text-[#94A3B8]">
                  <span className="text-[10px]">{c.icon}</span> {c.name}
                </span>
              ))}
              <span className="rounded-lg bg-[#1A2340] px-2.5 py-1 text-xs text-[#94A3B8]">
                +{SUPPORTED_CHAINS.length - 8} more
              </span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#475569]">
          No gas fees required · We only verify wallet ownership
        </p>
      </div>
    </div>
  );
}
