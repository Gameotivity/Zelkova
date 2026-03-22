"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletAuth } from "@/lib/wallet/use-wallet-auth";
import { useHLAccount } from "@/lib/hyperliquid/use-hl-account";
import { getChainInfo } from "@/lib/wallet/config";
import { cn } from "@/lib/utils/cn";

function formatUsd(value: string | number): string {
  const num = Number(value);
  if (isNaN(num) || num === 0) return "$0.00";
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

export function TopNav() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const { address, isConnected, chainId, balance, user, isAuthenticating, authenticate, logout } = useWalletAuth();
  const hl = useHLAccount(address);

  const chain = chainId ? getChainInfo(chainId) : null;

  // Auto-authenticate when wallet connects but no session exists
  useEffect(() => {
    if (isConnected && address && !user && !isAuthenticating) {
      authenticate();
    }
  }, [isConnected, address, user, isAuthenticating, authenticate]);

  async function handleLogout() {
    await logout();
    setShowMenu(false);
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#1E293B] bg-[#06080E] px-6">
      <div />

      <div className="flex items-center gap-3">
        {/* Hyperliquid Connection Status */}
        {isConnected && (
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
            hl.connected
              ? "bg-[#10B981]/10 border border-[#10B981]/20"
              : hl.loading
                ? "bg-[#F59E0B]/10 border border-[#F59E0B]/20"
                : "bg-[#1A2340] border border-[#1E293B]"
          )}>
            <span className={cn(
              "relative flex h-2 w-2",
            )}>
              {hl.loading ? (
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#F59E0B]" />
              ) : hl.connected ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
                </>
              ) : (
                <span className="inline-flex h-2 w-2 rounded-full bg-[#475569]" />
              )}
            </span>
            <span className={cn(
              "font-medium",
              hl.connected ? "text-[#10B981]" : hl.loading ? "text-[#F59E0B]" : "text-[#94A3B8]"
            )}>
              {hl.loading ? "Connecting to HL..." : hl.connected ? "Hyperliquid" : "HL Disconnected"}
            </span>
          </div>
        )}

        {/* HL Equity */}
        {isConnected && hl.connected && Number(hl.equity) > 0 && (
          <div className="rounded-lg bg-[#1A2340] px-3 py-1.5">
            <span className="font-mono text-xs font-medium text-[#00E5FF]">
              {formatUsd(hl.equity)}
            </span>
          </div>
        )}

        {/* Chain badge */}
        {chain && (
          <div className="hidden items-center gap-1.5 rounded-lg bg-[#1A2340] px-3 py-1.5 text-xs sm:flex">
            <span>{chain.icon}</span>
            <span className="text-[#94A3B8]">{chain.name}</span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-[#1A2340] hover:text-[#E2E8F0]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#00E5FF]" />
        </button>

        {/* Wallet Connection */}
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="flex items-center gap-2 rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-4 py-2 text-sm font-semibold text-[#00E5FF] transition-all hover:bg-[#00E5FF]/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 rounded-xl border border-[#1E293B] bg-[#0F1629] px-3 py-2 transition-all hover:border-[#00E5FF]/30"
            >
              {isAuthenticating ? (
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#8B5CF6] text-[10px] font-bold text-white">
                  {address ? address.slice(2, 4).toUpperCase() : "Z"}
                </div>
              )}
              <span className="hidden font-mono text-xs text-[#E2E8F0] sm:inline">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connecting..."}
              </span>
              <svg className={cn("h-3.5 w-3.5 text-[#94A3B8] transition-transform", showMenu && "rotate-180")}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[#1E293B] bg-[#0F1629] py-2 shadow-2xl">
                  {/* Wallet info */}
                  <div className="border-b border-[#1E293B] px-4 pb-3 pt-1">
                    <p className="font-mono text-xs text-[#94A3B8] break-all">{address}</p>
                    {user && <p className="mt-1 text-xs text-[#00E5FF]">Authenticated</p>}
                  </div>

                  {/* HL Account Summary */}
                  {hl.connected && (
                    <div className="border-b border-[#1E293B] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Hyperliquid Account</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-[#475569]">Equity</p>
                          <p className="font-mono text-sm font-bold text-[#F8FAFC]">{formatUsd(hl.equity)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#475569]">Unrealized P&L</p>
                          <p className={cn("font-mono text-sm font-bold",
                            Number(hl.unrealizedPnl) >= 0 ? "text-[#10B981]" : "text-[#F43F5E]")}>
                            {Number(hl.unrealizedPnl) >= 0 ? "+" : ""}{formatUsd(hl.unrealizedPnl)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#475569]">Withdrawable</p>
                          <p className="font-mono text-xs text-[#E2E8F0]">{formatUsd(hl.withdrawable)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#475569]">Positions</p>
                          <p className="font-mono text-xs text-[#E2E8F0]">{hl.positionCount}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!hl.connected && isConnected && !hl.loading && (
                    <div className="border-b border-[#1E293B] px-4 py-3">
                      <p className="text-xs text-[#94A3B8]">No Hyperliquid account found for this wallet. Deposit funds on <a href="https://app.hyperliquid.xyz" target="_blank" rel="noopener noreferrer" className="text-[#00E5FF] hover:underline">app.hyperliquid.xyz</a> to get started.</p>
                    </div>
                  )}

                  <Link href="/settings" onClick={() => setShowMenu(false)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#E2E8F0] transition-colors hover:bg-[#1A2340]">
                    <svg className="h-4 w-4 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    Profile & Settings
                  </Link>

                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#F43F5E] transition-colors hover:bg-[#1A2340]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    Disconnect Wallet
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
