import type { ParsedReport } from "./types";

/**
 * Parse the formatted text report from HyperAlpha's format_decision_report()
 * into structured sections for display in the strategy pipeline UI.
 */
export function parseReport(report: string): ParsedReport {
  const result: ParsedReport = {
    analysts: [],
    debate: null,
    statArb: [],
    recommendation: null,
    risk: null,
    finalDecision: null,
    errors: [],
  };

  if (!report) return result;

  const lines = report.split("\n");

  let section = "";
  for (const line of lines) {
    const trimmed = line.trim();

    // Section detection
    if (trimmed.includes("ANALYST SIGNALS:")) { section = "analysts"; continue; }
    if (trimmed.includes("DEBATE CONSENSUS:")) { section = "debate"; continue; }
    if (trimmed.includes("STAT ARB SIGNALS:")) { section = "statarb"; continue; }
    if (trimmed.includes("RECOMMENDATION:")) { section = "recommendation"; continue; }
    if (trimmed.includes("RISK ASSESSMENT:")) { section = "risk"; continue; }
    if (trimmed === "APPROVED" || trimmed === "REJECTED") { section = "final"; result.finalDecision = { approved: trimmed === "APPROVED", notes: "" }; continue; }
    if (trimmed.includes("ERRORS:")) { section = "errors"; continue; }

    // Parse per section
    if (section === "analysts") {
      // Format: [+] Fundamentals: BUY (72%)
      const m = trimmed.match(/\[(.)\]\s+(\w+):\s+(\w+)\s+\((\d+%)\)/);
      if (m) {
        result.analysts.push({ icon: m[1], name: m[2], signal: m[3], confidence: m[4] });
      }
    }

    if (section === "debate") {
      const sigMatch = trimmed.match(/Signal:\s+(\w+)\s+\((\d+%)\)/);
      if (sigMatch) {
        result.debate = result.debate || { signal: "", confidence: "", thesis: "", quality: "" };
        result.debate.signal = sigMatch[1];
        result.debate.confidence = sigMatch[2];
      }
      const thesisMatch = trimmed.match(/Thesis:\s+(.+)/);
      if (thesisMatch && result.debate) result.debate.thesis = thesisMatch[1];
      const qualMatch = trimmed.match(/Quality:\s+(\d+%)/);
      if (qualMatch && result.debate) result.debate.quality = qualMatch[1];
    }

    if (section === "statarb") {
      const m = trimmed.match(/-\s+(.+?):\s+(\w+)\s+\(z=([\d.-]+)\)/);
      if (m) {
        result.statArb.push({ strategy: m[1], signal: m[2], zScore: m[3] });
      }
    }

    if (section === "recommendation") {
      if (!result.recommendation) {
        result.recommendation = {
          action: "", ticker: "", entry: null, stopLoss: null, takeProfit: null,
          size: null, leverage: null, confidence: "", timeHorizon: null, alignment: "",
        };
      }
      const r = result.recommendation;
      const actionMatch = trimmed.match(/\[(LONG|SHORT|HOLD)\]\s+RECOMMENDATION:\s+(\w+)\s+(\w+)/);
      if (actionMatch) { r.action = actionMatch[2]; r.ticker = actionMatch[3]; }
      const entryMatch = trimmed.match(/Entry:\s+\$?([\d,.]+)/);
      if (entryMatch) r.entry = entryMatch[1];
      const slMatch = trimmed.match(/Stop Loss:\s+\$?([\d,.]+)/);
      if (slMatch) r.stopLoss = slMatch[1];
      const tpMatch = trimmed.match(/Take Profit:\s+\$?([\d,.]+)/);
      if (tpMatch) r.takeProfit = tpMatch[1];
      const sizeMatch = trimmed.match(/Size:\s+\$?([\d,.]+)/);
      if (sizeMatch) r.size = sizeMatch[1];
      const levMatch = trimmed.match(/Leverage:\s+([\d.]+)x/);
      if (levMatch) r.leverage = levMatch[1];
      const confMatch = trimmed.match(/Confidence:\s+(\d+%)/);
      if (confMatch) r.confidence = confMatch[1];
      const horizonMatch = trimmed.match(/Time Horizon:\s+(.+)/);
      if (horizonMatch) r.timeHorizon = horizonMatch[1];
      const alignMatch = trimmed.match(/Signal Alignment:\s+(\d\/\d)/);
      if (alignMatch) r.alignment = alignMatch[1];
    }

    if (section === "risk") {
      if (!result.risk) {
        result.risk = { approved: false, riskScore: "0", warnings: [], vetoReason: null };
      }
      if (trimmed.startsWith("Approved:")) result.risk.approved = trimmed.includes("YES");
      const rsMatch = trimmed.match(/Risk Score:\s+([\d.]+)/);
      if (rsMatch) result.risk.riskScore = rsMatch[1];
      if (trimmed.startsWith("WARNING:")) result.risk.warnings.push(trimmed.replace("WARNING:", "").trim());
      const vetoMatch = trimmed.match(/VETO:\s+(.+)/);
      if (vetoMatch) result.risk.vetoReason = vetoMatch[1];
    }

    if (section === "final" && result.finalDecision && trimmed && !trimmed.startsWith("=")) {
      result.finalDecision.notes = trimmed;
    }

    if (section === "errors" && trimmed.startsWith("-")) {
      result.errors.push(trimmed.replace(/^-\s*/, ""));
    }
  }

  return result;
}
