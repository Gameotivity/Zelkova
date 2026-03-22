"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepIndicator, NavButtons } from "@/components/agents/builder-steps";
import { StepTemplate } from "@/components/agents/step-template";
import { StepConfigure } from "@/components/agents/step-configure";
import { StepRisk } from "@/components/agents/step-risk";
import { StepBacktest } from "@/components/agents/step-backtest";
import { StepDeploy } from "@/components/agents/step-deploy";
import { PREBUILT_BOTS, type BotConfig } from "@/components/agents/bot-data";

const STEPS = ["Template", "Configure", "Risk", "Backtest", "Deploy"];

const DEFAULT_CUSTOM_CONFIG: BotConfig = {
  strategies: [],
  stopLossPct: 5,
  takeProfitPct: 10,
  maxPositionSizePct: 15,
  maxDailyLossPct: 3,
  trailingStop: false,
  cooldownMinutes: 5,
  capitalAllocation: 2000,
};

export default function NewAgentPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center text-[#94A3B8]">Loading...</div>}>
      <NewAgentContent />
    </Suspense>
  );
}

function NewAgentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTemplate = searchParams.get("template");

  const [step, setStep] = useState(initialTemplate ? 1 : 0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(initialTemplate);
  const [agentName, setAgentName] = useState("");
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["BTC-USD"]);
  const [mode, setMode] = useState<"PAPER" | "LIVE">("PAPER");

  const templateBot = useMemo(
    () => PREBUILT_BOTS.find((b) => b.id === selectedTemplate),
    [selectedTemplate]
  );

  const [config, setConfig] = useState<BotConfig>(
    templateBot?.defaultConfig ?? DEFAULT_CUSTOM_CONFIG
  );

  const handleTemplateSelect = useCallback(
    (id: string | null) => {
      setSelectedTemplate(id);
      const bot = PREBUILT_BOTS.find((b) => b.id === id);
      if (bot) {
        setConfig(bot.defaultConfig);
        setSelectedPairs(bot.supportedPairs);
        setAgentName(`My ${bot.name}`);
      } else {
        setConfig(DEFAULT_CUSTOM_CONFIG);
        setSelectedPairs(["BTC/USDT"]);
        setAgentName("");
      }
    },
    []
  );

  const togglePair = useCallback((pair: string) => {
    setSelectedPairs((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair]
    );
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return selectedTemplate !== null;
      case 1:
        return agentName.length > 0 && selectedPairs.length > 0;
      case 2:
        return config.stopLossPct > 0 && config.takeProfitPct > 0;
      case 3:
        return true;
      default:
        return true;
    }
  }, [step, selectedTemplate, agentName, selectedPairs, config]);

  async function handleDeploy() {
    try {
      await fetch("/api/trpc/agents.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          type: "CRYPTO",
          pairs: selectedPairs,
          strategy: config.strategies.map((s) => s.id).join("+"),
          strategyConfig: Object.fromEntries(
            config.strategies.map((s) => [s.id, s.params])
          ),
          riskConfig: {
            stopLossPct: config.stopLossPct,
            takeProfitPct: config.takeProfitPct,
            maxPositionSizePct: config.maxPositionSizePct,
            maxDailyLossPct: config.maxDailyLossPct,
            trailingStop: config.trailingStop,
            cooldownMinutes: config.cooldownMinutes,
          },
          capitalAllocation: config.capitalAllocation,
          mode,
          template: selectedTemplate !== "custom" ? selectedTemplate : undefined,
        }),
      });
      router.push("/agents");
    } catch {
      // Error handled by global handler
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F1629] p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00E5FF]/5 to-[#8B5CF6]/5" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            Build Your Trading Bot
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Step {step + 1} of {STEPS.length} &mdash; {STEPS[step]}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} current={step} />

      {/* Step content */}
      {step === 0 && (
        <StepTemplate
          selected={selectedTemplate}
          onSelect={handleTemplateSelect}
        />
      )}

      {step === 1 && (
        <StepConfigure
          isTemplate={selectedTemplate !== "custom"}
          config={config}
          onConfigChange={setConfig}
          agentName={agentName}
          onNameChange={setAgentName}
          selectedPairs={selectedPairs}
          onTogglePair={togglePair}
        />
      )}

      {step === 2 && (
        <StepRisk config={config} onConfigChange={setConfig} />
      )}

      {step === 3 && (
        <StepBacktest
          config={config}
          templateName={templateBot?.name ?? null}
        />
      )}

      {step === 4 && (
        <StepDeploy
          config={config}
          agentName={agentName}
          selectedPairs={selectedPairs}
          templateName={templateBot?.name ?? null}
          mode={mode}
          onModeChange={setMode}
        />
      )}

      {/* Navigation */}
      <NavButtons
        step={step}
        maxStep={STEPS.length - 1}
        canContinue={canContinue}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onDeploy={handleDeploy}
      />
    </div>
  );
}
