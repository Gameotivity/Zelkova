"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage, useDisconnect, useBalance } from "wagmi";
import { verifyMessage } from "viem";

interface WalletUser {
  id: string;
  walletAddress: string;
  name: string;
  chainId: number;
  image: string | null;
  subscriptionTier: string;
}

interface WalletProfile {
  username: string;
  displayName: string | null;
  rank: number | null;
  totalPnl: number;
  badges: Array<{ id: string; name: string; icon: string; earnedAt: string }> | null;
}

interface WalletAuthState {
  user: WalletUser | null;
  profile: WalletProfile | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  error: string | null;
}

export function useWalletAuth() {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });

  const [state, setState] = useState<WalletAuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticating: false,
    error: null,
  });

  // Check existing session
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/wallet/session");
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        user: data.user,
        profile: data.profile,
        isLoading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Auto-authenticate when wallet connects
  const authenticate = useCallback(async () => {
    if (!address || !isConnected) return;

    setState((prev) => ({ ...prev, isAuthenticating: true, error: null }));

    try {
      // 1. Get nonce from server
      const nonceRes = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nonce", address }),
      });
      const { message } = await nonceRes.json();

      if (!message) {
        throw new Error("Failed to get nonce");
      }

      // 2. Sign the message with wallet
      const signature = await signMessageAsync({ message });

      // 3. Verify client-side first
      const isValid = await verifyMessage({
        address,
        message,
        signature,
      });

      if (!isValid) {
        throw new Error("Signature verification failed");
      }

      // 4. Send to server to create/fetch user + session
      const verifyRes = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          address,
          message,
          signature,
          chainId: chainId ?? 1,
        }),
      });

      const data = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setState((prev) => ({
        ...prev,
        user: data.user,
        profile: data.profile,
        isAuthenticating: false,
      }));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setState((prev) => ({
        ...prev,
        isAuthenticating: false,
        error: message,
      }));
      return false;
    }
  }, [address, isConnected, chainId, signMessageAsync]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/wallet/session", { method: "DELETE" });
    disconnect();
    setState({
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticating: false,
      error: null,
    });
  }, [disconnect]);

  return {
    ...state,
    address,
    isConnected,
    chainId,
    balance: balanceData,
    authenticate,
    logout,
    checkSession,
  };
}
