"use client";

import { cn } from "@/lib/utils/cn";

interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
                i < current
                  ? "bg-[#10B981] text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : i === current
                    ? "bg-[#00E5FF] text-[#06080E] shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                    : "bg-[#1A2340] text-[#94A3B8]"
              )}
            >
              {i < current ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:inline",
                i === current ? "font-medium text-[#F8FAFC]" : "text-[#94A3B8]"
              )}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-3 h-px w-8 transition-all duration-200",
                i < current ? "bg-[#10B981]" : "bg-[#1E293B]"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface Tooltip {
  text: string;
}

export function InfoTooltip({ text }: Tooltip) {
  return (
    <span className="group relative ml-1 inline-flex cursor-help">
      <svg className="h-4 w-4 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-[#1A2340] p-3 text-xs text-[#E2E8F0] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1A2340]" />
      </span>
    </span>
  );
}

interface NavButtonsProps {
  step: number;
  maxStep: number;
  canContinue: boolean;
  onBack: () => void;
  onNext: () => void;
  onDeploy: () => void;
}

export function NavButtons({ step, maxStep, canContinue, onBack, onNext, onDeploy }: NavButtonsProps) {
  return (
    <div className="flex justify-between pt-4">
      <button
        onClick={onBack}
        className={cn(
          "rounded-lg border border-[#1E293B] px-6 py-2.5 text-sm font-medium text-[#E2E8F0] transition-all duration-200 hover:border-[#00E5FF]/50",
          step === 0 && "invisible"
        )}
      >
        Back
      </button>

      {step < maxStep ? (
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="rounded-lg bg-[#00E5FF] px-8 py-2.5 text-sm font-semibold text-[#06080E] transition-all duration-200 hover:bg-[#00E5FF]/90 hover:shadow-[0_0_20px_rgba(0,229,255,0.2)] disabled:opacity-30 disabled:hover:shadow-none"
        >
          Continue
        </button>
      ) : (
        <button
          onClick={onDeploy}
          className="rounded-lg bg-[#10B981] px-8 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#10B981]/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          Deploy Agent
        </button>
      )}
    </div>
  );
}
