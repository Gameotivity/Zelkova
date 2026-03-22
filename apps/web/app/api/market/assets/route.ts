import { NextResponse } from "next/server";

const HL_INFO_URL = "https://api.hyperliquid.xyz/info";

interface HlAssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
}

interface HlMetaResponse {
  universe: HlAssetMeta[];
}

export async function GET() {
  try {
    const res = await fetch(HL_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch assets from Hyperliquid" },
        { status: 502 }
      );
    }

    const meta = (await res.json()) as HlMetaResponse;

    const assets = meta.universe.map((asset, index) => ({
      index,
      name: asset.name,
      szDecimals: asset.szDecimals,
      maxLeverage: asset.maxLeverage,
      onlyIsolated: asset.onlyIsolated ?? false,
    }));

    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json(
      { error: "Hyperliquid API request failed" },
      { status: 502 }
    );
  }
}
