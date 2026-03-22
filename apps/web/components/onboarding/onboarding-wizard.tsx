"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { arbitrum } from "wagmi/chains";
import { useWalletAuth } from "@/lib/wallet/use-wallet-auth";
import { cn } from "@/lib/utils/cn";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = [
  { id: "welcome", title: "Welcome to Zelkora" },
  { id: "connect", title: "Connect Wallet" },
  { id: "network", title: "Switch Network" },
  { id: "ready", title: "You're Ready" },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { user, authenticate, isAuthenticating } = useWalletAuth();

  const isArbitrum = chainId === arbitrum.id;

  // Auto-advance when wallet connects
  useEffect(() => {
    if (isConnected && address && step === 1) {
      setStep(2);
    }
  }, [isConnected, address, step]);

  // Auto-advance when network is correct
  useEffect(() => {
    if (isArbitrum && step === 2) {
      setStep(3);
    }
  }, [isArbitrum, step]);

  // Auto-authenticate when on correct network
  useEffect(() => {
    if (isConnected && address && isArbitrum && !user && !isAuthenticating) {
      authenticate();
    }
  }, [isConnected, address, isArbitrum, user, isAuthenticating, authenticate]);

  const handleSwitchNetwork = useCallback(() => {
    switchChain({ chainId: arbitrum.id });
  }, [switchChain]);

  const handleSkip = useCallback(() => {
    localStorage.setItem("zelkora-onboarding-done", "true");
    onComplete();
  }, [onComplete]);

  const handleFinish = useCallback(() => {
    localStorage.setItem("zelkora-onboarding-done", "true");
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#06080E]">
      {/* Background effects */}
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,229,255,0.03) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-[#00E5FF]/[0.05] blur-[200px]" />
      <div className="absolute bottom-1/4 right-1/3 h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/[0.04] blur-[200px]" />

      <div className="relative z-10 mx-auto w-full max-w-lg px-6">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                i < step ? "bg-[#10B981] text-white" :
                i === step ? "bg-[#00E5FF] text-[#06080E] shadow-lg shadow-[#00E5FF]/30" :
                "bg-[#1A2340] text-[#475569]"
              )}>
                {i < step ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 w-8 rounded-full transition-all duration-300",
                  i < step ? "bg-[#10B981]" : "bg-[#1A2340]"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-[#1E293B] bg-[#0F1629] shadow-2xl">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#8B5CF6]">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-[#F8FAFC]">Welcome to Zelkora.ai</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                Deploy autonomous AI trading bots on Hyperliquid DEX.
                Non-custodial, on-chain, powered by AI.
              </p>

              <div className="mt-6 space-y-3 text-left">
                {[
                  { icon: "1", text: "Connect your wallet (MetaMask, WalletConnect, etc.)" },
                  { icon: "2", text: "Switch to Arbitrum network" },
                  { icon: "3", text: "Start trading with AI-powered bots" },
                ].map((item) => (
                  <div key={item.icon} className="flex items-center gap-3 rounded-lg bg-[#1A2340]/50 px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00E5FF]/10 text-xs font-bold text-[#00E5FF]">{item.icon}</span>
                    <span className="text-sm text-[#E2E8F0]">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={handleSkip}
                  className="flex-1 rounded-xl border border-[#1E293B] py-3 text-sm font-medium text-[#94A3B8] transition-all hover:bg-[#1A2340]">
                  Skip for now
                </button>
                <button onClick={() => setStep(1)}
                  className="flex-1 rounded-xl bg-[#00E5FF] py-3 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25">
                  Get Started
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Connect Wallet */}
          {step === 1 && (
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00E5FF]/10">
                <svg className="h-8 w-8 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#F8FAFC]">Connect Your Wallet</h2>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Choose your preferred wallet. We never hold your keys or funds.
              </p>

              <div className="mt-6">
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button onClick={openConnectModal}
                      className="w-full rounded-xl bg-[#00E5FF] py-4 text-base font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25">
                      Connect Wallet
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>

              <div className="mt-6 rounded-xl border border-[#1E293B] bg-[#06080E] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Supported Wallets</p>
                <div className="mt-3 flex justify-center gap-6">
                  {["MetaMask", "WalletConnect", "Coinbase", "Rainbow"].map((w) => (
                    <span key={w} className="text-xs text-[#94A3B8]">{w}</span>
                  ))}
                </div>
              </div>

              <button onClick={handleSkip} className="mt-4 text-xs text-[#475569] hover:text-[#94A3B8]">
                Skip for now
              </button>
            </div>
          )}

          {/* Step 2: Switch Network */}
          {step === 2 && (
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B5CF6]/10">
                <svg className="h-8 w-8 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#F8FAFC]">Switch to Arbitrum</h2>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Hyperliquid uses the Arbitrum network for wallet signing.
                Please switch your wallet to Arbitrum.
              </p>

              {isConnected && (
                <div className="mt-4 rounded-lg bg-[#1A2340]/50 px-4 py-2">
                  <p className="text-xs text-[#94A3B8]">
                    Connected: <span className="font-mono text-[#00E5FF]">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </p>
                </div>
              )}

              <div className="mt-6">
                {isArbitrum ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-[#10B981]/10 py-4 text-[#10B981]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="font-semibold">Already on Arbitrum!</span>
                  </div>
                ) : (
                  <button onClick={handleSwitchNetwork}
                    className="w-full rounded-xl bg-[#8B5CF6] py-4 text-base font-bold text-white transition-all hover:bg-[#7C3AED]">
                    Switch to Arbitrum
                  </button>
                )}
              </div>

              <button onClick={() => { setStep(3); }}
                className="mt-4 text-xs text-[#475569] hover:text-[#94A3B8]">
                Continue anyway
              </button>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#10B981]/10">
                <svg className="h-10 w-10 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-[#F8FAFC]">You're All Set!</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                Your wallet is connected. You can now explore the platform, build bots, and start trading.
              </p>

              {isConnected && address && (
                <div className="mt-5 rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 p-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#8B5CF6] text-sm font-bold text-white">
                      {address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-mono text-sm text-[#F8FAFC]">{address.slice(0, 6)}...{address.slice(-4)}</p>
                      <p className="text-xs text-[#10B981]">{isArbitrum ? "Arbitrum" : `Chain ${chainId}`}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-2 text-left">
                {[
                  { label: "Explore Dashboard", desc: "View market data and portfolio overview" },
                  { label: "Deploy a Bot", desc: "Choose from AI-powered presets or build custom" },
                  { label: "Copy Top Traders", desc: "Mirror the best performers automatically" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-[#1A2340]/30 px-4 py-3">
                    <p className="text-sm font-medium text-[#E2E8F0]">{item.label}</p>
                    <p className="text-xs text-[#475569]">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button onClick={handleFinish}
                className="mt-8 w-full rounded-xl bg-[#00E5FF] py-4 text-base font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25">
                Enter Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Step label */}
        <p className="mt-4 text-center text-xs text-[#475569]">
          Step {step + 1} of {STEPS.length} — {STEPS[step].title}
        </p>
      </div>
    </div>
  );
}
