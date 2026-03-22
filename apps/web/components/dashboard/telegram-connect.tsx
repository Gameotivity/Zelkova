"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface LinkStatus {
  linked: boolean;
  chatId: string | null;
}

interface CodeResponse {
  code: string;
  expiresIn: number;
}

const BOT_USERNAME = "ZelkoraBot";

export function TelegramConnect() {
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/link");
      if (res.ok) {
        const data = (await res.json()) as LinkStatus;
        setStatus(data);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Countdown timer for code expiry
  useEffect(() => {
    if (expiresIn <= 0) return;

    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          setCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresIn]);

  async function generateCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as CodeResponse;
        setCode(data.code);
        setExpiresIn(data.expiresIn);
      }
    } catch {
      /* silent */
    }
    setLoading(false);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (status?.linked) {
    return (
      <section className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TelegramIcon />
            <div>
              <h3 className="text-lg font-semibold text-[#F8FAFC]">
                Telegram Notifications
              </h3>
              <p className="mt-0.5 text-sm text-[#94A3B8]">
                Receive trade alerts and reports via Telegram
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-xl bg-[#10B981]/10 px-4 py-2.5 text-xs font-bold text-[#10B981]">
              <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              Connected
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#1E293B] bg-[#0F1629] p-6">
      <div className="flex items-center gap-4">
        <TelegramIcon />
        <div>
          <h3 className="text-lg font-semibold text-[#F8FAFC]">
            Telegram Notifications
          </h3>
          <p className="mt-0.5 text-sm text-[#94A3B8]">
            Get instant trade alerts, daily reports, and agent status updates
          </p>
        </div>
      </div>

      {!code ? (
        <div className="mt-5">
          <button
            onClick={generateCode}
            disabled={loading}
            className={cn(
              "rounded-xl px-6 py-2.5 text-sm font-bold transition-all duration-200",
              "bg-[#00E5FF] text-[#06080E] hover:shadow-lg hover:shadow-[#00E5FF]/20",
              loading && "opacity-50 cursor-not-allowed",
            )}
          >
            {loading ? "Generating..." : "Connect Telegram"}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Code display */}
          <div className="rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5 p-5">
            <p className="mb-3 text-sm font-medium text-[#E2E8F0]">
              Your link code:
            </p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-3xl font-bold tracking-[0.3em] text-[#00E5FF]">
                {code}
              </span>
              <CopyButton text={code} />
            </div>
            <p className="mt-3 text-xs text-[#94A3B8]">
              Expires in{" "}
              <span className="font-mono text-[#F59E0B]">
                {formatTime(expiresIn)}
              </span>
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-[#E2E8F0]">
              How to connect:
            </p>
            <ol className="space-y-2 text-sm text-[#94A3B8]">
              <li className="flex items-start gap-2">
                <StepBadge n={1} />
                <span>
                  Open{" "}
                  <a
                    href={`https://t.me/${BOT_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#00E5FF] transition-all hover:underline"
                  >
                    @{BOT_USERNAME}
                  </a>{" "}
                  on Telegram
                </span>
              </li>
              <li className="flex items-start gap-2">
                <StepBadge n={2} />
                <span>
                  Send the command:{" "}
                  <code className="rounded bg-[#1A2340] px-2 py-0.5 font-mono text-xs text-[#00E5FF]">
                    /link {code}
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <StepBadge n={3} />
                <span>Done! You will receive a confirmation message.</span>
              </li>
            </ol>
          </div>

          {/* Refresh status */}
          <button
            onClick={checkStatus}
            className="text-sm font-medium text-[#94A3B8] transition-all hover:text-[#00E5FF]"
          >
            Already linked? Click to refresh status
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TelegramIcon() {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/10">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 text-[#229ED9]"
        fill="currentColor"
      >
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1A2340] text-xs font-bold text-[#00E5FF]">
      {n}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  }

  return (
    <button
      onClick={copy}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
        copied
          ? "bg-[#10B981]/20 text-[#10B981]"
          : "bg-[#1A2340] text-[#94A3B8] hover:text-[#00E5FF]",
      )}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
