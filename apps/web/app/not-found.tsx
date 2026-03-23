import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#06080E] px-6 text-center">
      <div className="mb-6 flex items-center gap-1">
        <span className="text-2xl font-black text-[#00E5FF]">Zelkora</span>
        <span className="text-lg font-medium text-[#94A3B8]">.ai</span>
      </div>
      <h1 className="font-mono text-8xl font-black text-[#1E293B]">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-[#F8FAFC]">Page not found</h2>
      <p className="mt-2 max-w-md text-sm text-[#94A3B8]">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-[#00E5FF] px-8 py-3 text-sm font-bold text-[#06080E] transition-all hover:shadow-lg hover:shadow-[#00E5FF]/20 hover:-translate-y-0.5"
      >
        Go Home
      </Link>
    </div>
  );
}
