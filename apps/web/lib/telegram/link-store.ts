// ---------------------------------------------------------------------------
// In-memory link code store (shared between link API and webhook commands)
// ---------------------------------------------------------------------------

interface LinkEntry {
  userId: string;
  expiresAt: number;
}

/** In-memory store for pending link codes */
export const linkCodes = new Map<string, LinkEntry>();

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CODES = 10_000;

export function pruneExpired(): void {
  const now = Date.now();
  for (const [code, entry] of linkCodes) {
    if (entry.expiresAt < now) {
      linkCodes.delete(code);
    }
  }
}

export function generateCode(): string {
  const code = Math.floor(100_000 + Math.random() * 900_000).toString();
  if (linkCodes.has(code)) {
    return generateCode();
  }
  return code;
}

export { CODE_TTL_MS, MAX_CODES };
export type { LinkEntry };
