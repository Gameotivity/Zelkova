"use client";

import { useState } from "react";
import { useDemoAccount } from "@/lib/demo/use-demo-account";
import type { DemoPosition, DemoTrade } from "@/lib/demo/use-demo-account";

const COINS = ["BTC", "ETH", "SOL", "AVAX", "ARB", "OP", "DOGE", "LINK", "WIF", "PEPE"];
const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pnlCl = (v: number) => (v > 0 ? "text-[#10B981]" : v < 0 ? "text-[#F43F5E]" : "text-[#94A3B8]");
const pnlPx = (v: number) => (v > 0 ? "+" : "");
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 rounded-xl bg-[#0F1629]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 rounded-xl bg-[#0F1629]" />
        <div className="h-96 rounded-xl bg-[#0F1629]" />
      </div>
      <div className="h-64 rounded-xl bg-[#0F1629]" />
    </div>
  );
}

function Stat({ label, value, colored }: { label: string; value: string; colored?: number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-[#94A3B8] uppercase tracking-wider">{label}</p>
      <p className={`font-mono text-lg font-semibold mt-0.5 ${colored !== undefined ? pnlCl(colored) : "text-[#F8FAFC]"}`}>{value}</p>
    </div>
  );
}

function AccountBanner({ account, posCount, onReset }: { account: NonNullable<ReturnType<typeof useDemoAccount>["account"]>; posCount: number; onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-xl border border-[#F59E0B]/30 bg-[#0F1629] p-5 transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F59E0B]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
            Paper Trading
          </span>
          <span className="hidden sm:inline text-sm text-[#94A3B8]">Test strategies risk-free with $1,000 demo funds</span>
        </div>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#F59E0B]">Reset all data?</span>
            <button onClick={() => { onReset(); setConfirming(false); }} className="rounded-md bg-[#F43F5E]/10 px-3 py-1 text-xs font-medium text-[#F43F5E] hover:bg-[#F43F5E]/20 transition-all duration-200">Confirm</button>
            <button onClick={() => setConfirming(false)} className="rounded-md bg-[#1A2340] px-3 py-1 text-xs font-medium text-[#94A3B8] hover:text-[#E2E8F0] transition-all duration-200">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="rounded-md bg-[#1A2340] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0A0F1A] transition-all duration-200">Reset Account</button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Stat label="Starting Balance" value={fmt(account.startingBalance)} />
        <Stat label="Current Equity" value={fmt(account.currentBalance)} colored={account.currentBalance - account.startingBalance} />
        <Stat label="Total P&L" value={`${pnlPx(account.totalPnl)}${fmt(account.totalPnl)}`} colored={account.totalPnl} />
        <Stat label="Open Positions" value={String(posCount)} />
        <Stat label="Total Trades" value={String(account.totalTrades)} />
      </div>
    </div>
  );
}

function TradeForm({ balance, placing, error, onPlace }: { balance: number; placing: boolean; error: string | null; onPlace: (coin: string, side: "buy" | "sell", size: number, type: "market" | "limit", price?: number) => void }) {
  const [coin, setCoin] = useState("BTC");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const sizeNum = parseFloat(size) || 0;
  const insufficient = sizeNum > balance;
  function submit() {
    if (sizeNum <= 0 || insufficient) return;
    onPlace(coin, side, sizeNum, orderType, orderType === "limit" ? parseFloat(limitPrice) || undefined : undefined);
    setSize("");
    setLimitPrice("");
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[#94A3B8] mb-2 uppercase tracking-wider">Select Asset</p>
        <div className="grid grid-cols-5 gap-1.5">
          {COINS.map((c) => (
            <button key={c} onClick={() => setCoin(c)} className={`rounded-lg py-1.5 text-xs font-semibold transition-all duration-200 ${c === coin ? "bg-[#00E5FF]/10 text-[#00E5FF] ring-1 ring-[#00E5FF]/40" : "bg-[#0A0F1A] text-[#94A3B8] hover:text-[#E2E8F0]"}`}>{c}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setSide("buy")} className={`rounded-lg py-2 text-sm font-bold transition-all duration-200 ${side === "buy" ? "bg-[#10B981] text-white" : "bg-[#0A0F1A] text-[#94A3B8] hover:text-[#E2E8F0]"}`}>BUY / LONG</button>
        <button onClick={() => setSide("sell")} className={`rounded-lg py-2 text-sm font-bold transition-all duration-200 ${side === "sell" ? "bg-[#F43F5E] text-white" : "bg-[#0A0F1A] text-[#94A3B8] hover:text-[#E2E8F0]"}`}>SELL / SHORT</button>
      </div>
      <div>
        <p className="text-xs text-[#94A3B8] mb-1.5">Size (USD)</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-mono text-sm">$</span>
          <input type="number" value={size} onChange={(e) => setSize(e.target.value)} placeholder="0.00" className="w-full rounded-lg bg-[#0A0F1A] border border-[#1E293B] text-[#F8FAFC] font-mono text-sm py-2.5 pl-7 pr-3 placeholder:text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all duration-200" />
        </div>
        {insufficient && <p className="text-xs text-[#F43F5E] mt-1">Insufficient balance</p>}
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {[25, 50, 75, 100].map((pct) => (
            <button key={pct} onClick={() => setSize((balance * pct / 100).toFixed(2))} className="rounded-md bg-[#0A0F1A] py-1 text-xs text-[#94A3B8] hover:text-[#00E5FF] transition-all duration-200">{pct}%</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setOrderType("market")} className={`rounded-lg py-1.5 text-xs font-medium transition-all duration-200 ${orderType === "market" ? "bg-[#00E5FF]/10 text-[#00E5FF] ring-1 ring-[#00E5FF]/40" : "bg-[#0A0F1A] text-[#94A3B8]"}`}>Market</button>
        <button onClick={() => setOrderType("limit")} className={`rounded-lg py-1.5 text-xs font-medium transition-all duration-200 ${orderType === "limit" ? "bg-[#00E5FF]/10 text-[#00E5FF] ring-1 ring-[#00E5FF]/40" : "bg-[#0A0F1A] text-[#94A3B8]"}`}>Limit</button>
      </div>
      {orderType === "limit" && (
        <div>
          <p className="text-xs text-[#94A3B8] mb-1.5">Limit Price</p>
          <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="0.00" className="w-full rounded-lg bg-[#0A0F1A] border border-[#1E293B] text-[#F8FAFC] font-mono text-sm py-2.5 px-3 placeholder:text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all duration-200" />
        </div>
      )}
      {error && <p className="text-xs text-[#F43F5E] bg-[#F43F5E]/10 rounded-lg px-3 py-2">{error}</p>}
      <button onClick={submit} disabled={placing || sizeNum <= 0 || insufficient} className="w-full rounded-lg bg-[#00E5FF] py-3 text-sm font-bold text-[#06080E] hover:bg-[#00E5FF]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
        {placing && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
        Place Paper Trade
      </button>
    </div>
  );
}

function MarketInfo({ coin, positions }: { coin: string; positions: DemoPosition[] }) {
  const price = positions.find((p) => p.coin === coin)?.currentPrice;
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 py-6">
      <p className="text-xs text-[#94A3B8] uppercase tracking-wider">Selected Asset</p>
      <p className="text-4xl font-bold text-[#F8FAFC]">{coin}</p>
      {price ? <p className="font-mono text-2xl text-[#00E5FF]">{fmt(price)}</p> : <p className="font-mono text-lg text-[#475569]">Place a trade to see live price</p>}
      <a href={`/strategies?ticker=${coin}`} className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6]/10 px-4 py-2 text-sm font-medium text-[#8B5CF6] hover:bg-[#8B5CF6]/20 transition-all duration-200">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z" /><path d="M20.7 11A10 10 0 0 0 13 3.3" /></svg>
        Run AI Analysis on {coin}
      </a>
      <p className="text-[10px] text-[#475569] text-center max-w-[220px]">All trades use real Hyperliquid prices with simulated execution</p>
    </div>
  );
}

function PositionsTable({ positions, onClose }: { positions: DemoPosition[]; onClose: (id: string, coin: string) => void }) {
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5 transition-all duration-200">
      <h2 className="text-sm font-semibold text-[#F8FAFC] mb-3">Open Positions <span className="text-[#94A3B8]">({positions.length})</span></h2>
      {positions.length === 0 ? (
        <p className="text-sm text-[#475569] py-6 text-center">No open positions. Place your first trade above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[#94A3B8] border-b border-[#1E293B]">
              <th className="text-left py-2 font-medium">Coin</th><th className="text-left py-2 font-medium">Side</th><th className="text-right py-2 font-medium">Entry</th><th className="text-right py-2 font-medium">Current</th><th className="text-right py-2 font-medium">Size</th><th className="text-right py-2 font-medium">uPnL</th><th className="text-right py-2 font-medium">ROE%</th><th className="text-right py-2 font-medium" />
            </tr></thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className="border-b border-[#1E293B]/50 hover:bg-[#0A0F1A] transition-all duration-200">
                  <td className="py-2.5 font-semibold text-[#F8FAFC]">{p.coin}</td>
                  <td><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${p.side === "LONG" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F43F5E]/10 text-[#F43F5E]"}`}>{p.side}</span></td>
                  <td className="text-right font-mono text-[#E2E8F0]">{fmt(p.entryPrice)}</td>
                  <td className="text-right font-mono text-[#E2E8F0]">{fmt(p.currentPrice)}</td>
                  <td className="text-right font-mono text-[#E2E8F0]">{fmt(p.sizeUsd)}</td>
                  <td className={`text-right font-mono ${pnlCl(p.unrealizedPnl)}`}>{pnlPx(p.unrealizedPnl)}{fmt(p.unrealizedPnl)}</td>
                  <td className={`text-right font-mono ${pnlCl(p.roePct)}`}>{pnlPx(p.roePct)}{p.roePct.toFixed(2)}%</td>
                  <td className="text-right"><button onClick={() => onClose(p.id, p.coin)} className="rounded-md bg-[#F43F5E]/10 px-2 py-1 text-[10px] font-semibold text-[#F43F5E] hover:bg-[#F43F5E]/20 transition-all duration-200">Close</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TradeHistory({ trades }: { trades: DemoTrade[] }) {
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5 transition-all duration-200">
      <h2 className="text-sm font-semibold text-[#F8FAFC] mb-3">Trade History <span className="text-[#94A3B8]">({trades.length})</span></h2>
      {trades.length === 0 ? (
        <p className="text-sm text-[#475569] py-6 text-center">No trades yet.</p>
      ) : (
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0F1629]"><tr className="text-[#94A3B8] border-b border-[#1E293B]">
              <th className="text-left py-2 font-medium">Time</th><th className="text-left py-2 font-medium">Coin</th><th className="text-left py-2 font-medium">Side</th><th className="text-right py-2 font-medium">Price</th><th className="text-right py-2 font-medium">Qty</th><th className="text-right py-2 font-medium">Size</th><th className="text-right py-2 font-medium">Fee</th><th className="text-right py-2 font-medium">P&L</th><th className="text-right py-2 font-medium">Status</th>
            </tr></thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-[#1E293B]/50 hover:bg-[#0A0F1A] transition-all duration-200">
                  <td className="py-2.5 text-[#94A3B8]">{timeAgo(t.createdAt)}</td>
                  <td className="font-semibold text-[#F8FAFC]">{t.coin}</td>
                  <td><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${t.side === "BUY" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F43F5E]/10 text-[#F43F5E]"}`}>{t.side}</span></td>
                  <td className="text-right font-mono text-[#E2E8F0]">{fmt(t.price)}</td>
                  <td className="text-right font-mono text-[#E2E8F0]">{t.quantity.toFixed(4)}</td>
                  <td className="text-right font-mono text-[#E2E8F0]">{fmt(t.sizeUsd)}</td>
                  <td className="text-right font-mono text-[#94A3B8]">{fmt(t.fee)}</td>
                  <td className={`text-right font-mono ${t.pnl !== null ? pnlCl(t.pnl) : "text-[#475569]"}`}>{t.pnl !== null ? `${pnlPx(t.pnl)}${fmt(t.pnl)}` : "--"}</td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#F59E0B]/10 text-[#F59E0B]">PAPER</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#1A2340] text-[#94A3B8]">{t.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end pt-3 border-t border-[#1E293B]">
            <span className="text-xs text-[#94A3B8] mr-2">Running P&L:</span>
            <span className={`text-xs font-mono font-semibold ${pnlCl(totalPnl)}`}>{pnlPx(totalPnl)}{fmt(totalPnl)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const { account, positions, trades, loading, placing, error, placeTrade, closePosition, resetAccount } = useDemoAccount();
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  if (loading) return <div className="mx-auto max-w-6xl p-6"><Skeleton /></div>;
  const displayAccount = account ?? { startingBalance: 1000, currentBalance: 1000, totalPnl: 0, totalTrades: 0, resetCount: 0 };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {error && !placing && (
        <div className="rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/20 px-4 py-3 text-sm text-[#F43F5E]">{error}</div>
      )}
      <AccountBanner account={displayAccount} posCount={positions.length} onReset={resetAccount} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] p-5 transition-all duration-200">
          <h2 className="text-sm font-semibold text-[#F8FAFC] mb-4">Quick Trade</h2>
          <TradeForm balance={displayAccount.currentBalance} placing={placing} error={placing ? error : null} onPlace={(coin, side, sz, type, price) => { setSelectedCoin(coin); placeTrade({ coin, side, sizeUsd: sz, orderType: type, price }); }} />
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0F1629] transition-all duration-200">
          <MarketInfo coin={selectedCoin} positions={positions} />
        </div>
      </div>
      <PositionsTable positions={positions} onClose={closePosition} />
      <TradeHistory trades={trades} />
    </div>
  );
}
