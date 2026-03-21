# CLAUDE.md — Zelkora Project Instructions

## Project
Zelkora.ai is an autonomous trading agent builder for crypto (Binance/Bybit) and prediction markets (Polymarket). Monorepo with Next.js 14 frontend + Node.js worker service.

## Tech Stack
- Frontend: Next.js 14 (App Router), TailwindCSS, Zustand, React Query, tRPC
- Backend: Next.js Route Handlers + tRPC, Drizzle ORM, PostgreSQL (Supabase)
- Worker: Node.js, CCXT, Bull queue
- Real-Time: Socket.io WebSocket
- AI: OpenAI GPT-4o for suggestions, Claude API for analysis
- Testing: Vitest, Playwright, Artillery

## Code Standards
- TypeScript strict mode everywhere. No `any` types.
- All API inputs validated with Zod schemas.
- All database queries through Drizzle ORM (never raw SQL).
- Error handling: always return typed errors, never throw untyped.
- File naming: kebab-case for files, PascalCase for components.
- Max file length: 300 lines. Split into modules if longer.

## Brand Design System
- Background: #06080E (base), #0F1629 (cards), #1A2340 (elevated)
- Text: #F8FAFC (headings), #E2E8F0 (body), #94A3B8 (muted)
- Accent: #00E5FF (primary/cyan), #8B5CF6 (secondary/violet)
- Status: #10B981 (success/buy), #F43F5E (danger/sell), #F59E0B (warning)
- All cards: bg-[#0F1629] border border-[#1E293B] rounded-xl
- All transitions: transition-all duration-200
- Font: system-ui for UI, monospace for numbers/prices

## Testing Requirements
- Every new function needs a unit test in the adjacent __tests__ folder.
- Risk engine functions need edge case tests (negative values, overflow, etc.).
- After building a new feature, run: turbo test
- Before committing: turbo lint && turbo typecheck && turbo test

## Security Rules
- NEVER log API keys, passwords, or secrets.
- NEVER return unmasked API keys in API responses.
- All user input must pass Zod validation before processing.
- All database queries must use parameterized inputs (Drizzle handles this).
- Exchange API keys encrypted with AES-256-GCM before storage.

## Agent Safety
- ALL agents MUST have stop_loss configured before going live.
- Maximum leverage: 1x (spot only in MVP, no futures).
- Circuit breaker: if daily loss > 5% of capital, auto-pause agent.
- Global circuit breaker: if total portfolio drops > 15% in 24h, pause ALL.
