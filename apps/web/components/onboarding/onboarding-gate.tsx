"use client";

import { useState, useEffect } from "react";
import { OnboardingWizard } from "./onboarding-wizard";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("zelkora-onboarding-done");
    if (!done) {
      setShowOnboarding(true);
    }
    setChecked(true);
  }, []);

  // Don't render anything until we've checked localStorage
  if (!checked) return null;

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
}
