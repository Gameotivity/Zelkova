import { NextRequest, NextResponse } from "next/server";

const HL_INFO_URL = "https://api.hyperliquid.xyz/info";

interface HlMetaAndAssetCtx {
  universe: Array<{ name: string }>;
  assetCtxs: Array<{
    funding: string;
    premium: string;
    openInterest: string;
    prevDayPx: string;
    dayNtlVlm: string;
    markPx: string;
    midPx: string;
    oraclePx: string;
  }>;
}

export async function GET(req: NextRequest) {
  const coinFilter = req.nextUrl.searchParams.get("coin")?.toUpperCase();

  try {
    const res = await fetch(HL_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      next: { revalidate: 10 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch funding from Hyperliquid" },
        { status: 502 }
      );
    }

    const [meta, assetCtxs] = (await res.json()) as [
      HlMetaAndAssetCtx["universe"],
      HlMetaAndAssetCtx["assetCtxs"],
    ];

    // HL returns metaAndAssetCtxs as a tuple [{ universe }, assetCtxs[]]
    // but the actual response is [{universe: [...]}, [...]]
    const universe = Array.isArray(meta) ? meta : (meta as { universe: Array<{ name: string }> }).universe;

    let rates = universe.map((asset, i) => {
      const ctx = assetCtxs[i];
      return {
        coin: asset.name,
        fundingRate: parseFloat(ctx.funding),
        premium: parseFloat(ctx.premium),
        openInterest: parseFloat(ctx.openInterest),
        markPrice: parseFloat(ctx.markPx),
        oraclePrice: parseFloat(ctx.oraclePx),
      };
    });

    if (coinFilter) {
      rates = rates.filter((r) => r.coin === coinFilter);
    }

    return NextResponse.json({ rates });
  } catch {
    return NextResponse.json(
      { error: "Hyperliquid API request failed" },
      { status: 502 }
    );
  }
}
