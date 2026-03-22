import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("zelkora-session")?.value;
  if (!token) return null;

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(
      and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date()))
    )
    .limit(1);

  return session?.userId ?? null;
}

const approveSchema = z.object({
  nonce: z.number().int().nonnegative(),
});

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const parsed = approveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const builderAddress = process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS;
  if (!builderAddress) {
    return NextResponse.json(
      { error: "Builder address not configured" },
      { status: 500 }
    );
  }

  const maxFeeRateBps = parseInt(
    process.env.HL_BUILDER_FEE_BPS ?? "5",
    10
  );
  const maxFeeRate = `0.${String(maxFeeRateBps).padStart(4, "0")}`;

  const { nonce } = parsed.data;

  const typedData = {
    domain: {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: 42161,
      verifyingContract:
        "0x0000000000000000000000000000000000000000" as const,
    },
    types: {
      "HyperliquidTransaction:ApproveBuilderFee": [
        { name: "hyperliquidChain", type: "string" },
        { name: "maxFeeRate", type: "string" },
        { name: "builder", type: "address" },
        { name: "nonce", type: "uint64" },
      ],
    },
    primaryType:
      "HyperliquidTransaction:ApproveBuilderFee" as const,
    message: {
      hyperliquidChain: "Mainnet",
      maxFeeRate,
      builder: builderAddress,
      nonce,
    },
  };

  return NextResponse.json({
    ok: true,
    typedData,
    builderAddress,
    maxFeeRateBps,
  });
}
