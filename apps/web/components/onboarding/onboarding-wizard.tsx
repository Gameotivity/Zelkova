"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { arbitrum } from "wagmi/chains";
import { useWalletAuth } from "@/lib/wallet/use-wallet-auth";
import { cn } from "@/lib/utils/cn";
import {
  ONBOARDING_QUESTS,
  LEVELS,
  getLevelForXp,
  getXpProgress,
  getNextLevel,
  AVATAR_COLORS,
  BADGES,
} from "@/lib/gamification/xp-engine";

interface OnboardingWizardProps {
  onComplete: () => void;
}

type Screen = "character" | "quests" | "celebration";

function randomTag(): string {
  return "trader_" + Math.random().toString(36).slice(2, 6);
}

const CSS_ANIM = `
@keyframes xpPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
@keyframes xpFloat { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-48px)} }
@keyframes confettiRise { 0%{opacity:1;transform:translateY(0) rotate(0)} 100%{opacity:0;transform:translateY(-220px) rotate(360deg)} }
@keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes glow { 0%,100%{box-shadow:0 0 8px currentColor} 50%{box-shadow:0 0 24px currentColor} }
@keyframes countUp { from{opacity:0;transform:scale(.6)} to{opacity:1;transform:scale(1)} }
`;

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [screen, setScreen] = useState<Screen>("character");
  const [username, setUsername] = useState(randomTag());
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0].id);
  const [referral, setReferral] = useState("");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [xp, setXp] = useState(0);
  const [xpDelta, setXpDelta] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [profileSet, setProfileSet] = useState(false);

  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { user, authenticate, isAuthenticating } = useWalletAuth();

  const isArbitrum = chainId === arbitrum.id;
  const level = getLevelForXp(xp);
  const progress = getXpProgress(xp);
  const nextLvl = getNextLevel(level.level);
  const founderBadge = BADGES.find((b) => b.id === "founder");
  const myReferralCode = address ? address.slice(2, 10).toUpperCase() : "ZELK0000";

  const awardQuest = useCallback(
    (questId: string) => {
      if (completed.has(questId)) return;
      const quest = ONBOARDING_QUESTS.find((q) => q.id === questId);
      if (!quest) return;
      setCompleted((prev) => new Set(prev).add(questId));
      setXp((prev) => prev + quest.xp);
      setXpDelta(quest.xp);
      setTimeout(() => setXpDelta(null), 1200);
    },
    [completed],
  );

  // Auto-detect wallet connection
  useEffect(() => {
    if (isConnected && address && screen === "quests") awardQuest("WALLET_CONNECTED");
  }, [isConnected, address, screen, awardQuest]);

  // Auto-detect network
  useEffect(() => {
    if (isArbitrum && screen === "quests") awardQuest("NETWORK_SWITCHED");
  }, [isArbitrum, screen, awardQuest]);

  // Auto-auth
  useEffect(() => {
    if (isConnected && address && isArbitrum && !user && !isAuthenticating) authenticate();
  }, [isConnected, address, isArbitrum, user, isAuthenticating, authenticate]);

  // Profile quest from screen 1
  useEffect(() => {
    if (profileSet && screen === "quests") awardQuest("PROFILE_SET");
  }, [profileSet, screen, awardQuest]);

  const handleBeginJourney = () => {
    if (username.trim().length > 0) setProfileSet(true);
    setScreen("quests");
  };

  const handleFinish = () => {
    localStorage.setItem("zelkora-onboarding-done", "true");
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("zelkora-onboarding-done", "true");
    onComplete();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requiredDone = ["WALLET_CONNECTED", "NETWORK_SWITCHED", "PROFILE_SET"].every((id) =>
    completed.has(id),
  );
  const allDone = ONBOARDING_QUESTS.every((q) => completed.has(q.id));

  const questStatus = (id: string): "complete" | "available" | "locked" => {
    if (completed.has(id)) return "complete";
    if (id === "DASHBOARD_ENTERED") return requiredDone ? "available" : "locked";
    return "available";
  };

  const selectedAvatar = AVATAR_COLORS.find((c) => c.id === avatarColor) ?? AVATAR_COLORS[0];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#06080E]">
      <style>{CSS_ANIM}</style>
      {/* BG effects */}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,229,255,0.03) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-[#00E5FF]/[0.04] blur-[200px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/3 h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/[0.03] blur-[200px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-8" style={{ animation: "fadeIn .5s ease" }}>
        {/* ═══ Screen 1: Character Setup ═══ */}
        {screen === "character" && (
          <div className="w-full rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6 sm:p-8">
            <h1 className="bg-gradient-to-r from-[#00E5FF] to-[#8B5CF6] bg-clip-text text-center text-3xl font-black text-transparent">
              Welcome to Zelkora
            </h1>
            <p className="mt-2 text-center text-sm text-[#94A3B8]">Create your trader identity</p>

            {/* Username */}
            <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-[#475569]">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#1E293B] bg-[#06080E] px-4 py-3 font-mono text-sm text-[#F8FAFC] outline-none transition-all focus:border-[#00E5FF]"
              placeholder="trader_xxxx"
            />

            {/* Avatar color */}
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-[#475569]">Avatar Color</label>
            <div className="mt-3 flex flex-wrap gap-3">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setAvatarColor(c.id)}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all duration-200",
                    avatarColor === c.id ? "ring-2 ring-white ring-offset-2 ring-offset-[#0F1629] scale-110" : "hover:scale-105",
                  )}
                  style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                />
              ))}
            </div>

            {/* Preview */}
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#1E293B] bg-[#06080E] p-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${selectedAvatar.from}, ${selectedAvatar.to})` }}
              >
                {username.slice(0, 2).toUpperCase()}
              </div>
              <span className="truncate font-mono text-sm text-[#E2E8F0]">{username || "trader"}</span>
            </div>

            {/* Referral */}
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-[#475569]">Got an invite code?</label>
            <input
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#1E293B] bg-[#06080E] px-4 py-3 font-mono text-sm text-[#F8FAFC] outline-none transition-all focus:border-[#8B5CF6]"
              placeholder="Optional"
            />

            <button
              onClick={handleBeginJourney}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#8B5CF6] py-3.5 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25"
            >
              Begin Your Journey
            </button>
            <button onClick={handleSkip} className="mt-3 w-full py-2 text-xs text-[#475569] transition-all hover:text-[#94A3B8]">
              Skip for now
            </button>
          </div>
        )}

        {/* ═══ Screen 2: Quest Board ═══ */}
        {screen === "quests" && (
          <div className="w-full" style={{ animation: "fadeIn .4s ease" }}>
            {/* XP bar + level */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#E2E8F0]">Level {level.level}: {level.title}</span>
                  <span className="text-[#94A3B8]">
                    {nextLvl ? `${progress.current}/${progress.needed} XP` : "MAX"}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#1A2340]">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress.percent}%`, background: `linear-gradient(90deg, ${level.color}, #8B5CF6)` }}
                  />
                </div>
              </div>
              {/* Level badge */}
              <div
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-lg font-black"
                style={{ borderColor: level.color, color: level.color, animation: xpDelta ? "glow 1s ease" : undefined }}
              >
                {level.level}
              </div>
            </div>

            {/* XP float animation */}
            {xpDelta !== null && (
              <div className="pointer-events-none fixed left-1/2 top-1/3 z-50 -translate-x-1/2 text-xl font-black text-[#00E5FF]" style={{ animation: "xpFloat 1.2s ease forwards" }}>
                +{xpDelta} XP
              </div>
            )}

            {/* Quest cards */}
            <div className="space-y-3">
              {ONBOARDING_QUESTS.map((quest) => {
                const status = questStatus(quest.id);
                const borderColor = status === "complete" ? "#10B981" : status === "available" ? "#00E5FF" : "#1E293B";
                return (
                  <div
                    key={quest.id}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border bg-[#0F1629] p-4 transition-all duration-200",
                      status === "complete" && "bg-[#10B981]/[0.06]",
                      status === "locked" && "opacity-50",
                    )}
                    style={{ borderColor }}
                  >
                    {/* Icon */}
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", status === "complete" ? "bg-[#10B981]/10" : "bg-[#1A2340]")}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={status === "complete" ? "#10B981" : "#94A3B8"} strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={quest.icon} />
                      </svg>
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#F8FAFC]">{quest.title}</p>
                      <p className="text-xs text-[#94A3B8]">{quest.description}</p>

                      {/* Inline actions */}
                      {quest.id === "WALLET_CONNECTED" && !completed.has(quest.id) && (
                        <ConnectButton.Custom>
                          {({ openConnectModal }) => (
                            <button onClick={openConnectModal} className="mt-2 rounded-lg bg-[#00E5FF]/10 px-3 py-1.5 text-xs font-semibold text-[#00E5FF] transition-all hover:bg-[#00E5FF]/20">
                              Connect Wallet
                            </button>
                          )}
                        </ConnectButton.Custom>
                      )}
                      {quest.id === "NETWORK_SWITCHED" && !completed.has(quest.id) && isConnected && (
                        <button onClick={() => switchChain({ chainId: arbitrum.id })} className="mt-2 rounded-lg bg-[#8B5CF6]/10 px-3 py-1.5 text-xs font-semibold text-[#8B5CF6] transition-all hover:bg-[#8B5CF6]/20">
                          Switch Network
                        </button>
                      )}
                      {quest.id === "FRIEND_INVITED" && !completed.has(quest.id) && status === "available" && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded bg-[#06080E] px-2 py-1 font-mono text-xs text-[#E2E8F0]">{myReferralCode}</span>
                          <button onClick={() => { handleCopy(myReferralCode); awardQuest("FRIEND_INVITED"); }} className="rounded-lg bg-[#8B5CF6]/10 px-3 py-1.5 text-xs font-semibold text-[#8B5CF6] transition-all hover:bg-[#8B5CF6]/20">
                            {copied ? "Copied" : "Copy & Share"}
                          </button>
                          <button onClick={() => awardQuest("FRIEND_INVITED")} className="text-xs text-[#475569] hover:text-[#94A3B8]">Skip</button>
                        </div>
                      )}
                      {quest.id === "DASHBOARD_ENTERED" && status === "available" && (
                        <button
                          onClick={() => { awardQuest("DASHBOARD_ENTERED"); setTimeout(() => setScreen("celebration"), 600); }}
                          className="mt-2 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#8B5CF6] px-4 py-1.5 text-xs font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/20"
                        >
                          Enter the Arena
                        </button>
                      )}
                    </div>

                    {/* XP + status */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", status === "complete" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#1A2340] text-[#94A3B8]")}>
                        +{quest.xp} XP
                      </span>
                      {status === "complete" && (
                        <svg className="h-5 w-5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                      {status === "available" && (
                        <svg className="h-5 w-5 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      )}
                      {status === "locked" && (
                        <svg className="h-5 w-5 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={handleSkip} className="mt-5 w-full py-2 text-xs text-[#475569] transition-all hover:text-[#94A3B8]">
              Skip onboarding
            </button>
          </div>
        )}

        {/* ═══ Screen 3: Celebration ═══ */}
        {screen === "celebration" && (
          <div className="w-full text-center" style={{ animation: "fadeIn .5s ease" }}>
            {/* Confetti particles */}
            <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 6 + (i % 4) * 2,
                    height: 6 + (i % 4) * 2,
                    left: `${4 + (i * 4) % 92}%`,
                    bottom: -10,
                    background: ["#00E5FF", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E", "#FFD700"][i % 6],
                    animation: `confettiRise ${1.8 + (i % 5) * 0.4}s ease ${i * 0.08}s infinite`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-50 rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6 sm:p-8">
              {/* Level badge */}
              <div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 text-3xl font-black"
                style={{ borderColor: level.color, color: level.color, animation: "glow 2s ease infinite" }}
              >
                {level.level}
              </div>
              <h2 className="mt-4 text-2xl font-black text-[#F8FAFC]" style={{ animation: "countUp .6s ease" }}>
                Level {level.level} Achieved!
              </h2>
              <p className="text-sm font-semibold" style={{ color: level.color }}>{level.title}</p>

              {/* Founder badge */}
              {founderBadge && (
                <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/[0.06] px-4 py-2" style={{ animation: "glow 2s ease infinite", color: "#FFD700" }}>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={founderBadge.icon} />
                  </svg>
                  <span className="text-sm font-bold">{founderBadge.name} Badge</span>
                </div>
              )}

              {/* XP summary */}
              <div className="mt-5 rounded-xl bg-[#06080E] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">XP Earned</p>
                <p className="mt-1 text-3xl font-black text-[#00E5FF]" style={{ animation: "countUp .8s ease" }}>
                  {xp} XP
                </p>
              </div>

              {/* Referral share */}
              <div className="mt-4 rounded-xl border border-[#1E293B] bg-[#1A2340]/40 p-4">
                <p className="text-xs text-[#94A3B8]">Share to earn 20% of their fees</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="rounded bg-[#06080E] px-3 py-1.5 font-mono text-sm text-[#F8FAFC]">{myReferralCode}</span>
                  <button
                    onClick={() => handleCopy(myReferralCode)}
                    className="rounded-lg bg-[#8B5CF6]/10 px-3 py-1.5 text-xs font-semibold text-[#8B5CF6] transition-all hover:bg-[#8B5CF6]/20"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#8B5CF6] py-4 text-base font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/25"
              >
                Enter Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
