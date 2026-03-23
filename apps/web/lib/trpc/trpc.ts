import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

interface Context {
  userId: string | null;
}

export async function createContext(): Promise<Context> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("zelkora-session")?.value;
    if (!token) return { userId: null };

    const [session] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date())))
      .limit(1);

    return { userId: session?.userId ?? null };
  } catch {
    return { userId: null };
  }
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { userId: ctx.userId },
  });
});
