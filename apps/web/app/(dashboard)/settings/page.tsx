"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { useWalletAuth } from "@/lib/wallet/use-wallet-auth";
import { getChainInfo } from "@/lib/wallet/config";

type Tab = "profile" | "security" | "exchanges" | "notifications";

interface ProfileData {
  name: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  country: string;
  twitter: string;
  telegram: string;
  website: string;
  tradingExperience: string;
  favoriteAssets: string[];
  isPublic: boolean;
  showOnLeaderboard: boolean;
}

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "profile", label: "Profile", icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" },
  { id: "security", label: "Security", icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" },
  { id: "exchanges", label: "Exchanges", icon: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" },
  { id: "notifications", label: "Notifications", icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" },
];

const COUNTRIES = ["", "United States", "United Kingdom", "Germany", "France", "Japan", "South Korea", "Singapore", "UAE", "India", "Canada", "Australia", "Brazil", "Turkey", "Nigeria", "South Africa", "Other"];
const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Less than 1 year" },
  { value: "intermediate", label: "Intermediate", desc: "1-3 years" },
  { value: "advanced", label: "Advanced", desc: "3-5 years" },
  { value: "expert", label: "Expert", desc: "5+ years" },
];
const ASSETS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "DOT", "MATIC"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profile, setProfile] = useState<ProfileData>({
    name: "", email: "", username: "", displayName: "", bio: "",
    country: "", twitter: "", telegram: "", website: "",
    tradingExperience: "beginner", favoriteAssets: [],
    isPublic: true, showOnLeaderboard: true,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({
          ...prev, name: data.user?.name || "", email: data.user?.email || "",
          username: data.profile?.username || "", displayName: data.profile?.displayName || "",
          bio: data.profile?.bio || "", country: data.profile?.country || "",
          twitter: data.profile?.twitter || "", telegram: (data.profile?.telegram && data.profile.telegram !== "undefined" && data.profile.telegram !== "null") ? data.profile.telegram : "",
          website: data.profile?.website || "", tradingExperience: data.profile?.tradingExperience || "beginner",
          favoriteAssets: data.profile?.favoriteAssets || [],
          isPublic: data.profile?.isPublic ?? true, showOnLeaderboard: data.profile?.showOnLeaderboard ?? true,
        }));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const autoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileRef.current) });
        setSaveStatus(res.ok ? "saved" : "error");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
    }, 600);
  }, []);

  const updateProfile = useCallback((updater: (prev: ProfileData) => ProfileData) => {
    setProfile(updater);
    autoSave();
  }, [autoSave]);

  function toggleAsset(asset: string) {
    updateProfile((p) => ({ ...p, favoriteAssets: p.favoriteAssets.includes(asset) ? p.favoriteAssets.filter((a) => a !== asset) : [...p.favoriteAssets, asset].slice(0, 10) }));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Settings</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">Manage your profile, security, and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          <button onClick={() => autoSave()} className="rounded-xl bg-[#00E5FF] px-5 py-2.5 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/20">
            Save Changes
          </button>
        </div>
      </div>
      <div className="mb-6 flex gap-1 rounded-xl border border-[#1E293B] bg-[#0F1629] p-1">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              activeTab === tab.id ? "bg-[#1A2340] text-[#00E5FF]" : "text-[#94A3B8] hover:text-[#E2E8F0]")}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "profile" && (
        <div className="space-y-6">
          <WalletCard />
          <ProfileSection profile={profile} setProfile={updateProfile} toggleAsset={toggleAsset} />
          <SocialSection profile={profile} setProfile={updateProfile} />
          <PreferencesSection profile={profile} setProfile={updateProfile} />
        </div>
      )}
      {activeTab === "security" && <SecuritySection />}
      {activeTab === "exchanges" && <ExchangeSection />}
      {activeTab === "notifications" && <NotificationsSection />}
    </div>
  );
}

function SaveIndicator({ status }: { status: string }) {
  const cfg = { idle: { text: "All changes saved", bg: "bg-[#1A2340] text-[#94A3B8]" }, saving: { text: "Saving...", bg: "bg-[#F59E0B]/10 text-[#F59E0B]" }, saved: { text: "Saved", bg: "bg-[#10B981]/10 text-[#10B981]" }, error: { text: "Failed", bg: "bg-[#F43F5E]/10 text-[#F43F5E]" } }[status] ?? { text: "", bg: "" };
  return (
    <span className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all", cfg.bg)}>
      {status === "saving" && <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
      {status === "saved" && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
      {cfg.text}
    </span>
  );
}

function WalletCard() {
  const { address, chainId, balance } = useWalletAuth();
  const chain = chainId ? getChainInfo(chainId) : null;
  const bal = balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "—";
  return (
    <section className="rounded-2xl border border-[#00E5FF]/20 bg-gradient-to-r from-[#00E5FF]/5 to-[#8B5CF6]/5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#8B5CF6] text-lg font-bold text-white">{address ? address.slice(2, 4).toUpperCase() : "ZK"}</div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">Connected Wallet</p>
            <p className="mt-0.5 font-mono text-sm font-medium text-[#F8FAFC]">{address || "Not connected"}</p>
            <div className="mt-1 flex items-center gap-3">
              {chain && <span className="flex items-center gap-1 text-xs text-[#94A3B8]"><span>{chain.icon}</span> {chain.name}</span>}
              <span className="font-mono text-xs font-medium text-[#10B981]">{bal}</span>
            </div>
          </div>
        </div>
        <div className="flex h-3 w-3 rounded-full bg-[#10B981] shadow-lg shadow-[#10B981]/50 animate-pulse" />
      </div>
    </section>
  );
}

function ProfileSection({ profile, setProfile, toggleAsset }: { profile: ProfileData; setProfile: (fn: (prev: ProfileData) => ProfileData) => void; toggleAsset: (a: string) => void }) {
  return (
    <section className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
      <h2 className="mb-5 text-lg font-semibold text-[#F8FAFC]">Personal Info</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Display Name" value={profile.displayName} onChange={(v) => setProfile((p) => ({ ...p, displayName: v }))} placeholder="How others see you" />
          <InputField label="Username" value={profile.username} prefix="@" onChange={(v) => setProfile((p) => ({ ...p, username: v.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} placeholder="unique_handle" />
        </div>
        <InputField label="Full Name" value={profile.name} onChange={(v) => setProfile((p) => ({ ...p, name: v }))} placeholder="Your full name" />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#E2E8F0]">Bio</label>
          <textarea value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} maxLength={280} rows={3} placeholder="Tell traders about your style..."
            className="w-full rounded-xl border border-[#1E293B] bg-[#06080E] px-4 py-3 text-[#E2E8F0] placeholder-[#475569] outline-none transition-all focus:border-[#00E5FF] resize-none" />
          <p className="mt-1 text-right text-xs text-[#475569]">{profile.bio.length}/280</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#E2E8F0]">Country</label>
            <select value={profile.country} onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
              className="w-full rounded-xl border border-[#1E293B] bg-[#06080E] px-4 py-3 text-[#E2E8F0] outline-none transition-all focus:border-[#00E5FF]">
              <option value="">Select country</option>
              {COUNTRIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#E2E8F0]">Experience Level</label>
            <select value={profile.tradingExperience} onChange={(e) => setProfile((p) => ({ ...p, tradingExperience: e.target.value }))}
              className="w-full rounded-xl border border-[#1E293B] bg-[#06080E] px-4 py-3 text-[#E2E8F0] outline-none transition-all focus:border-[#00E5FF]">
              {EXPERIENCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label} — {l.desc}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#E2E8F0]">Favorite Assets</label>
          <div className="flex flex-wrap gap-2">
            {ASSETS.map((a) => (
              <button key={a} onClick={() => toggleAsset(a)}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  profile.favoriteAssets.includes(a) ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40" : "bg-[#1A2340] text-[#94A3B8] border border-[#1E293B] hover:border-[#00E5FF]/30")}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialSection({ profile, setProfile }: { profile: ProfileData; setProfile: (fn: (prev: ProfileData) => ProfileData) => void }) {
  return (
    <section className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
      <h2 className="mb-5 text-lg font-semibold text-[#F8FAFC]">Social & Links</h2>
      <div className="space-y-4">
        <InputField label="Twitter / X" value={profile.twitter} prefix="@" onChange={(v) => setProfile((p) => ({ ...p, twitter: v.replace("@", "") }))} placeholder="handle" />
        <InputField label="Telegram" value={profile.telegram} prefix="@" onChange={(v) => setProfile((p) => ({ ...p, telegram: v.replace("@", "") }))} placeholder="username" />
        <InputField label="Website" value={profile.website} onChange={(v) => setProfile((p) => ({ ...p, website: v }))} placeholder="https://yoursite.com" />
      </div>
    </section>
  );
}

function PreferencesSection({ profile, setProfile }: { profile: ProfileData; setProfile: (fn: (prev: ProfileData) => ProfileData) => void }) {
  return (
    <section className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
      <h2 className="mb-5 text-lg font-semibold text-[#F8FAFC]">Privacy & Leaderboard</h2>
      <div className="space-y-4">
        <ToggleRow label="Public Profile" desc="Allow other traders to view your profile" value={profile.isPublic} onChange={(v) => setProfile((p) => ({ ...p, isPublic: v }))} />
        <ToggleRow label="Show on Leaderboard" desc="Display your P&L and rank on the global leaderboard" value={profile.showOnLeaderboard} onChange={(v) => setProfile((p) => ({ ...p, showOnLeaderboard: v }))} />
      </div>
    </section>
  );
}

function SecuritySection() {
  const [setupData, setSetupData] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [is2FA, setIs2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetch("/api/profile").then((r) => r.json()).then((d) => { if (d.user?.is2FAEnabled) setIs2FA(true); }).catch(() => {}); }, []);

  async function setup2FA() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup" }) });
      const data = await res.json();
      if (data.secret) setSetupData(data); else setMsg(data.error || "Failed");
    } catch { setMsg("Network error"); }
    setLoading(false);
  }

  async function enable2FA() {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enable", code, secret: setupData?.secret }) });
      const data = await res.json();
      if (data.success) { setIs2FA(true); setSetupData(null); setCode(""); setMsg("2FA enabled!"); } else setMsg(data.error || "Invalid code");
    } catch { setMsg("Network error"); }
    setLoading(false);
  }

  async function disable2FA() {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disable", code }) });
      const data = await res.json();
      if (data.success) { setIs2FA(false); setCode(""); setMsg("2FA disabled"); } else setMsg(data.error || "Invalid code");
    } catch { setMsg("Network error"); }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
        <h2 className="mb-5 text-lg font-semibold text-[#F8FAFC]">Security</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-[#1E293B] bg-[#06080E] p-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-[#E2E8F0]">Two-Factor Authentication</p><p className="text-sm text-[#94A3B8]">{is2FA ? "Active — your account is secured" : "Required for live trading"}</p></div>
              {is2FA ? <span className="rounded-xl bg-[#10B981]/10 px-4 py-2.5 text-xs font-bold text-[#10B981]">Enabled</span>
                : <button onClick={setup2FA} disabled={loading} className="rounded-xl bg-[#00E5FF] px-5 py-2.5 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/20 disabled:opacity-50">{loading ? "Setting up..." : "Enable 2FA"}</button>}
            </div>
            {setupData && !is2FA && (
              <div className="mt-4 space-y-3 border-t border-[#1E293B] pt-4">
                <p className="text-sm text-[#E2E8F0]">Enter this secret in your authenticator app:</p>
                <div className="rounded-lg bg-[#1A2340] p-3"><p className="break-all font-mono text-xs text-[#00E5FF]">{setupData.secret}</p></div>
                <div className="flex gap-3">
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" maxLength={6}
                    className="w-40 rounded-xl border border-[#1E293B] bg-[#06080E] px-4 py-2.5 font-mono text-center text-lg tracking-widest text-[#F8FAFC] outline-none focus:border-[#00E5FF]" />
                  <button onClick={enable2FA} disabled={code.length !== 6 || loading} className="rounded-xl bg-[#10B981] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#10B981]/90 disabled:opacity-50">Verify & Enable</button>
                </div>
              </div>
            )}
            {is2FA && (
              <div className="mt-4 border-t border-[#1E293B] pt-4">
                <div className="flex items-center gap-3">
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter code to disable" maxLength={6}
                    className="w-48 rounded-xl border border-[#1E293B] bg-[#06080E] px-4 py-2.5 font-mono text-center tracking-widest text-[#F8FAFC] outline-none focus:border-[#F43F5E]" />
                  <button onClick={disable2FA} disabled={code.length !== 6 || loading} className="rounded-xl border border-[#F43F5E] px-4 py-2.5 text-sm font-medium text-[#F43F5E] transition-all hover:bg-[#F43F5E]/10 disabled:opacity-50">Disable 2FA</button>
                </div>
              </div>
            )}
            {msg && <p className="mt-2 text-xs text-[#F59E0B]">{msg}</p>}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#06080E] p-4">
            <div><p className="font-medium text-[#E2E8F0]">Wallet Authentication</p><p className="text-sm text-[#94A3B8]">Your wallet signature is your password</p></div>
            <span className="rounded-xl bg-[#10B981]/10 px-4 py-2.5 text-xs font-bold text-[#10B981]">Secured</span>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-[#F43F5E]/30 bg-[#F43F5E]/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#F43F5E]">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-[#E2E8F0]">Delete Account</p><p className="text-sm text-[#94A3B8]">Permanently delete your account and all data</p></div>
          <button className="rounded-xl border border-[#F43F5E] px-5 py-2.5 text-sm font-bold text-[#F43F5E] transition-all hover:bg-[#F43F5E] hover:text-white">Delete Account</button>
        </div>
      </section>
    </div>
  );
}

function ExchangeSection() {
  const [walletStatus, setWalletStatus] = useState<{ connected: boolean; walletAddress: string | null; builderFeeApproved: boolean }>({
    connected: false, walletAddress: null, builderFeeApproved: false,
  });

  useEffect(() => {
    fetch("/api/exchanges").then((r) => r.json()).then((d) => {
      setWalletStatus({ connected: d.connected ?? false, walletAddress: d.walletAddress ?? null, builderFeeApproved: d.builderFeeApproved ?? false });
    }).catch(() => {});
  }, []);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Hyperliquid Connection</h2>
        </div>
        <div className="space-y-4">
          {/* Wallet Status */}
          <div className="rounded-xl border border-[#1E293B] bg-[#06080E] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00E5FF]/10">
                <svg className="h-6 w-6 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#E2E8F0]">Wallet Connection</p>
                <p className="text-xs text-[#94A3B8]">Connect your wallet to trade on Hyperliquid. Non-custodial — we never hold your keys.</p>
              </div>
              <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-medium text-[#F59E0B]">Not Connected</span>
            </div>
          </div>

          {/* Builder Fee */}
          <div className="rounded-xl border border-[#1E293B] bg-[#06080E] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5CF6]/10">
                <svg className="h-6 w-6 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#E2E8F0]">Builder Fee Approval</p>
                <p className="text-xs text-[#94A3B8]">Approve the 0.05% builder fee to enable bot trading. One-time signature required.</p>
              </div>
              <span className="rounded-full bg-[#475569]/10 px-3 py-1 text-xs font-medium text-[#475569]">Pending</span>
            </div>
          </div>

          {/* API Wallet */}
          <div className="rounded-xl border border-[#1E293B] bg-[#06080E] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#10B981]/10">
                <svg className="h-6 w-6 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#E2E8F0]">API Wallet Delegation</p>
                <p className="text-xs text-[#94A3B8]">Delegate a sub-wallet for automated bot trading. Your main wallet stays safe.</p>
              </div>
              <span className="rounded-full bg-[#475569]/10 px-3 py-1 text-xs font-medium text-[#475569]">Not Set Up</span>
            </div>
          </div>

          <p className="text-xs text-[#475569]">All trading happens on Hyperliquid DEX. Connect your wallet on the dashboard to get started.</p>
        </div>
      </div>
    </section>
  );
}

function NotificationsSection() {
  const [notifs, setNotifs] = useState({ tradeAlerts: true, agentStatus: true, dailyReport: false, priceAlerts: false });
  const [telegramCode, setTelegramCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const items = [
    { key: "tradeAlerts" as const, label: "Trade Alerts", desc: "Get notified when bots execute trades" },
    { key: "agentStatus" as const, label: "Bot Status", desc: "Alerts when bots pause or encounter errors" },
    { key: "dailyReport" as const, label: "Daily Report", desc: "Daily P&L summary via Telegram" },
    { key: "priceAlerts" as const, label: "Price Alerts", desc: "Custom price level notifications" },
  ];

  async function generateTelegramCode() {
    setGenerating(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (data.code) setTelegramCode(data.code);
    } catch { /* silent */ }
    setGenerating(false);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0088cc]/10">
            <svg className="h-5 w-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Telegram Bot</h2>
            <p className="text-sm text-[#94A3B8]">Get real-time notifications and check your portfolio via Telegram</p>
          </div>
        </div>
        {telegramCode ? (
          <div className="rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/5 p-4">
            <p className="text-sm text-[#E2E8F0]">Send this command to <span className="font-semibold text-[#00E5FF]">@ZelkoraBot</span> on Telegram:</p>
            <div className="mt-2 rounded-lg bg-[#06080E] p-3"><code className="font-mono text-lg font-bold tracking-wider text-[#00E5FF]">/link {telegramCode}</code></div>
            <p className="mt-2 text-xs text-[#94A3B8]">Code expires in 10 minutes. Commands: /portfolio, /agents, /report, /help</p>
          </div>
        ) : (
          <button onClick={generateTelegramCode} disabled={generating}
            className="w-full rounded-xl border border-[#0088cc]/30 bg-[#0088cc]/10 px-5 py-3 text-sm font-semibold text-[#0088cc] transition-all hover:bg-[#0088cc]/20 disabled:opacity-50">
            {generating ? "Generating..." : "Connect Telegram Bot"}
          </button>
        )}
      </section>
      <section className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
        <h2 className="mb-5 text-lg font-semibold text-[#F8FAFC]">Notification Preferences</h2>
        <div className="space-y-3">
          {items.map((item) => <ToggleRow key={item.key} label={item.label} desc={item.desc} value={notifs[item.key]} onChange={(v) => setNotifs((p) => ({ ...p, [item.key]: v }))} />)}
        </div>
      </section>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, prefix }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#E2E8F0]">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569] text-sm">{prefix}</span>}
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={cn("w-full rounded-xl border border-[#1E293B] bg-[#06080E] py-3 text-[#E2E8F0] placeholder-[#475569] outline-none transition-all focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20", prefix ? "pl-8 pr-4" : "px-4")} />
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#06080E] p-4">
      <div><p className="font-medium text-[#E2E8F0]">{label}</p><p className="text-sm text-[#94A3B8]">{desc}</p></div>
      <button onClick={() => onChange(!value)} className={cn("relative h-6 w-11 rounded-full transition-all", value ? "bg-[#00E5FF]" : "bg-[#1A2340]")}>
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: value ? "22px" : "2px" }} />
      </button>
    </div>
  );
}
