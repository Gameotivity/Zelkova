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
@keyframes particle-float { 0%{transform:translateY(100vh) scale(0);opacity:0} 10%{opacity:1;transform:translateY(90vh) scale(1)} 90%{opacity:.6} 100%{transform:translateY(-10vh) scale(.5);opacity:0} }
@keyframes orbit { from{transform:rotate(0deg) translateX(var(--orbit-r)) rotate(0deg)} to{transform:rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg)} }
@keyframes pulse-ring { 0%{transform:scale(1);opacity:.4} 50%{transform:scale(1.4);opacity:0} 100%{transform:scale(1);opacity:.4} }
@keyframes grid-pulse { 0%,100%{opacity:.03} 50%{opacity:.08} }
@keyframes badge-spin { 0%{transform:rotateY(0)} 100%{transform:rotateY(360deg)} }
@keyframes shimmer-move { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes quest-unlock { 0%{transform:scale(.9);opacity:0;filter:blur(4px)} 100%{transform:scale(1);opacity:1;filter:blur(0)} }
@keyframes energy-wave { 0%{transform:scaleX(0);opacity:1} 100%{transform:scaleX(1);opacity:0} }
`;

/** Floating particles background — game-like energy */
function GameParticles() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Grid pulse */}
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,229,255,0.05) 1px, transparent 0)", backgroundSize: "30px 30px", animation: "grid-pulse 4s ease-in-out infinite" }} />

      {/* Orbiting rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {[120, 200, 300].map((r, i) => (
          <div key={r} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ width: r * 2, height: r * 2, borderColor: `rgba(0,229,255,${0.08 - i * 0.02})`, animation: `orbit ${20 + i * 10}s linear infinite`, ['--orbit-r' as string]: `${r}px` }}>
            <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#00E5FF]" style={{ boxShadow: "0 0 8px #00E5FF" }} />
          </div>
        ))}
      </div>

      {/* Rising particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: 3 + (i % 4) * 2,
          height: 3 + (i % 4) * 2,
          left: `${(i * 3.3) % 100}%`,
          background: ["#00E5FF", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E"][i % 5],
          opacity: 0,
          animation: `particle-float ${6 + (i % 8) * 2}s ease-in-out ${i * 0.4}s infinite`,
          boxShadow: `0 0 6px ${["#00E5FF", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E"][i % 5]}40`,
        }} />
      ))}

      {/* Pulsing rings */}
      {[
        { x: "15%", y: "20%", color: "#00E5FF" },
        { x: "80%", y: "30%", color: "#8B5CF6" },
        { x: "50%", y: "70%", color: "#10B981" },
      ].map((ring, i) => (
        <div key={i} className="absolute" style={{ left: ring.x, top: ring.y }}>
          <div className="h-4 w-4 rounded-full" style={{ background: ring.color, boxShadow: `0 0 12px ${ring.color}` }} />
          <div className="absolute inset-0 rounded-full" style={{ border: `1px solid ${ring.color}`, animation: `pulse-ring 3s ease-in-out ${i * 0.8}s infinite` }} />
          <div className="absolute -inset-2 rounded-full" style={{ border: `1px solid ${ring.color}40`, animation: `pulse-ring 3s ease-in-out ${i * 0.8 + 0.5}s infinite` }} />
        </div>
      ))}

      {/* Glow orbs */}
      <div className="absolute left-[20%] top-[30%] h-[400px] w-[400px] rounded-full bg-[#00E5FF]/[0.06] blur-[150px] animate-pulse" style={{ animationDuration: "5s" }} />
      <div className="absolute right-[15%] bottom-[20%] h-[350px] w-[350px] rounded-full bg-[#8B5CF6]/[0.05] blur-[150px] animate-pulse" style={{ animationDuration: "7s" }} />
      <div className="absolute left-[50%] top-[60%] h-[200px] w-[200px] rounded-full bg-[#10B981]/[0.04] blur-[100px] animate-pulse" style={{ animationDuration: "4s" }} />
    </div>
  );
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [screen, setScreen] = useState<Screen>("character");
  const [username, setUsername] = useState("trader_");

  // Generate random tag on client only to avoid hydration mismatch
  useEffect(() => {
    if (username === "trader_") setUsername(randomTag());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [myReferralCode, setMyReferralCode] = useState("ZELK-XXXXXX");

  useEffect(() => {
    if (address) {
      setMyReferralCode(`ZELK-${address.slice(2, 8).toUpperCase()}`);
    } else {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "ZELK-";
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      setMyReferralCode(code);
    }
  }, [address]);

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

  // Only profile is required to unlock "Enter the Arena" — wallet + network are bonus XP
  const canEnterArena = completed.has("PROFILE_SET");
  const allDone = ONBOARDING_QUESTS.every((q) => completed.has(q.id));

  const questStatus = (id: string): "complete" | "available" | "locked" => {
    if (completed.has(id)) return "complete";
    if (id === "DASHBOARD_ENTERED") return canEnterArena ? "available" : "locked";
    return "available";
  };

  const selectedAvatar = AVATAR_COLORS.find((c) => c.id === avatarColor) ?? AVATAR_COLORS[0];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#06080E]">
      <style>{CSS_ANIM}</style>
      <GameParticles />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-8" style={{ animation: "fadeIn .5s ease" }}>
        {/* ═══ Screen 1: Character Setup ═══ */}
        {screen === "character" && (
          <div className="relative w-full overflow-hidden rounded-2xl border border-[#00E5FF]/20 bg-[#0F1629]/90 p-6 backdrop-blur-xl sm:p-8 shadow-[0_0_40px_rgba(0,229,255,0.08)]">
            {/* Animated border shimmer */}
            <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.1), transparent)", backgroundSize: "200% 100%", animation: "shimmer-move 3s linear infinite" }} />

            <h1 className="relative text-center text-3xl font-black" style={{ background: "linear-gradient(90deg, #00E5FF, #8B5CF6, #00E5FF)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer-move 3s linear infinite" }}>
              Welcome to Zelkora
            </h1>
            <p className="relative mt-2 text-center text-sm text-[#94A3B8]">Create your trader identity</p>

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
              {ONBOARDING_QUESTS.map((quest, qi) => {
                const status = questStatus(quest.id);
                const borderColor = status === "complete" ? "#10B981" : status === "available" ? "#00E5FF" : "#1E293B";
                return (
                  <div
                    key={quest.id}
                    className={cn(
                      "relative flex items-center gap-4 rounded-xl border bg-[#0F1629]/90 p-4 backdrop-blur-sm transition-all duration-300",
                      status === "complete" && "bg-[#10B981]/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.1)]",
                      status === "available" && "shadow-[0_0_15px_rgba(0,229,255,0.08)]",
                      status === "locked" && "opacity-40",
                    )}
                    style={{ borderColor, animation: `quest-unlock 0.5s ease ${qi * 0.12}s both` }}
                  >
                    {/* Energy wave on complete */}
                    {status === "complete" && (
                      <div className="absolute inset-0 rounded-xl" style={{ background: `linear-gradient(90deg, transparent, ${borderColor}20, transparent)`, animation: "energy-wave 1.5s ease forwards" }} />
                    )}
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
            {/* Confetti particles — massive burst */}
            <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 6 + (i % 4) * 2,
                    height: 6 + (i % 4) * 2,
                    left: `${(i * 2) % 100}%`,
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
