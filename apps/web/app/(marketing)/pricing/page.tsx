import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with paper trading",
    features: [
      "1 trading agent",
      "Paper trading only",
      "Basic dashboard",
      "Community support",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For serious traders",
    features: [
      "5 trading agents",
      "Live trading enabled",
      "Full backtesting suite",
      "AI parameter suggestions",
      "Email alerts",
      "Priority support",
    ],
    cta: "Coming Soon",
    highlight: true,
    comingSoon: true,
  },
  {
    name: "Elite",
    price: "$99",
    period: "/mo",
    description: "Maximum alpha",
    features: [
      "Unlimited agents",
      "Priority execution",
      "Code editor for custom strategies",
      "Advanced analytics",
      "API access",
      "Dedicated support",
    ],
    cta: "Coming Soon",
    highlight: false,
    comingSoon: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zelkora-base pt-24">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-center text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
          Simple pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-lg text-text-muted">
          Start free, upgrade when you&apos;re ready to go live.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-8 ${
                tier.highlight
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-zelkora-border bg-zelkora-card"
              }`}
            >
              <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
              <p className="mt-1 text-sm text-text-muted">{tier.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-text-primary">{tier.price}</span>
                {tier.period && <span className="text-text-muted">{tier.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-body">
                    <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {tier.comingSoon ? (
                <div className="mt-8 rounded-lg border border-zelkora-border py-2.5 text-center text-sm font-medium text-text-muted">
                  Coming Soon
                </div>
              ) : (
                <Link
                  href="/register"
                  className="mt-8 block rounded-lg bg-accent-primary py-2.5 text-center text-sm font-semibold text-zelkora-base transition-all hover:bg-accent-primary/90"
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
