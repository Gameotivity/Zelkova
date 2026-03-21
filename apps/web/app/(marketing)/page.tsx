import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zelkora-base">
      <nav className="fixed top-0 z-50 w-full border-b border-zelkora-border bg-zelkora-base/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-accent-primary">
              Zelkora
            </span>
            <span className="text-sm text-text-muted">.ai</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/features"
              className="text-sm text-text-muted transition-colors hover:text-text-body"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-text-muted transition-colors hover:text-text-body"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm text-text-muted transition-colors hover:text-text-body"
            >
              Docs
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-text-muted transition-colors hover:text-text-body"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-zelkora-base transition-all duration-200 hover:bg-accent-primary/90"
            >
              Start Building
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent-secondary/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-text-primary md:text-7xl">
            Your AI Agents.
            <br />
            <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              Your Alpha.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-muted md:text-xl">
            Build autonomous trading agents that monitor crypto markets and
            prediction markets 24/7. No code required. Deploy in 5 minutes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-accent-primary px-8 py-3 text-base font-semibold text-zelkora-base transition-all duration-200 hover:bg-accent-primary/90 hover:shadow-lg hover:shadow-accent-primary/25"
            >
              Start Building (Free)
            </Link>
            <button className="rounded-lg border border-zelkora-border px-8 py-3 text-base font-semibold text-text-body transition-all duration-200 hover:border-accent-primary/50 hover:text-accent-primary">
              Watch Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
