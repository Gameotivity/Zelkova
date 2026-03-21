import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

interface Context {
  session: Session | null;
}

export async function createContext(): Promise<Context> {
  const session = await auth();
  return { session };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { session: ctx.session, userId: ctx.session.user.id! },
  });
});
