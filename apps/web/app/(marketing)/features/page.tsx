export default function FeaturesPage() {
  const features = [
    {
      title: "5 Pre-Built Strategies",
      description: "Grid Bot, DCA, RSI Crossover, EMA Crossover, and Breakout — configure in minutes.",
    },
    {
      title: "Paper Trading",
      description: "Test your agents risk-free with simulated trading before going live.",
    },
    {
      title: "Live Trading",
      description: "One click to go live on Binance or Bybit with real capital and real profits.",
    },
    {
      title: "AI-Powered Suggestions",
      description: "Get smart parameter recommendations based on historical data and market conditions.",
    },
    {
      title: "Risk Controls",
      description: "Mandatory stop-loss, circuit breakers, daily loss limits, and trailing stops.",
    },
    {
      title: "Prediction Markets",
      description: "Deploy agents on Polymarket to find and exploit mispriced events.",
    },
  ];

  return (
    <div className="min-h-screen bg-zelkora-base pt-24">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-center text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
          Everything you need to{" "}
          <span className="text-accent-primary">trade autonomously</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-text-muted">
          Zelkora gives you the tools to build, test, and deploy trading agents across crypto and prediction markets.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zelkora-border bg-zelkora-card p-6 transition-all duration-200 hover:border-accent-primary/50"
            >
              <h3 className="text-lg font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
