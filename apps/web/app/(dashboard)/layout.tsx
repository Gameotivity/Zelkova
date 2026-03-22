import { Suspense } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";
import { WalletProviders } from "@/lib/wallet/providers";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { FullPageLoader } from "@/components/dashboard/loading-logo";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProviders>
      <OnboardingGate>
        <div className="flex h-screen overflow-hidden bg-zelkora-base">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNav />
            <main className="flex-1 overflow-y-auto p-6">
              <Suspense fallback={<FullPageLoader />}>{children}</Suspense>
            </main>
          </div>
        </div>
      </OnboardingGate>
    </WalletProviders>
  );
}
