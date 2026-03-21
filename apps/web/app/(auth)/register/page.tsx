"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Auto sign in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zelkora-base px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-accent-primary">
            Zelkora<span className="text-text-muted">.ai</span>
          </Link>
          <p className="mt-2 text-text-muted">Create your account</p>
        </div>

        <div className="rounded-xl border border-zelkora-border bg-zelkora-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-body">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body placeholder-text-disabled outline-none transition-all duration-200 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-body">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body placeholder-text-disabled outline-none transition-all duration-200 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-body">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zelkora-border-subtle bg-zelkora-base px-4 py-2.5 text-text-body placeholder-text-disabled outline-none transition-all duration-200 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent-primary py-2.5 text-sm font-semibold text-zelkora-base transition-all duration-200 hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
