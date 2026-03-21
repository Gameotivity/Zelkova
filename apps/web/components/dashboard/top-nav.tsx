"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function TopNav() {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zelkora-border bg-zelkora-base px-6">
      <div />

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-zelkora-elevated hover:text-text-body">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-primary" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-zelkora-elevated hover:text-text-body"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/10 text-xs font-bold text-accent-primary">
              Z
            </div>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-zelkora-border bg-zelkora-card py-1 shadow-xl">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center px-4 py-2 text-sm text-text-muted transition-colors hover:bg-zelkora-elevated hover:text-text-body"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
