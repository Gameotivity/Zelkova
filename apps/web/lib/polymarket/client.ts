const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

export interface PolymarketEvent {
  id: string;
  conditionId: string;
  title: string;
  description: string;
  endDate: string;
  category: string;
  outcomes: Array<{ name: string; price: number }>;
  volume: number;
  liquidity: number;
}

export interface OddsHistory {
  timestamp: number;
  price: number;
}

/** Fetch active Polymarket events */
export async function fetchActiveEvents(
  category?: string,
  limit = 50
): Promise<PolymarketEvent[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    active: "true",
    closed: "false",
  });

  if (category) params.set("tag", category);

  const res = await fetch(`${GAMMA_API_BASE}/events?${params}`);
  if (!res.ok) throw new Error(`Polymarket API error: ${res.status}`);

  const data = await res.json();

  return data.map((event: any) => ({
    id: event.id,
    conditionId: event.condition_id || event.id,
    title: event.title,
    description: event.description || "",
    endDate: event.end_date_iso,
    category: event.tags?.[0] || "Other",
    outcomes: (event.markets || []).map((m: any) => ({
      name: m.outcome || m.groupItemTitle,
      price: parseFloat(m.outcomePrices?.[0] || m.bestBid || "0.5"),
    })),
    volume: parseFloat(event.volume || "0"),
    liquidity: parseFloat(event.liquidity || "0"),
  }));
}

/** Fetch event details */
export async function getEventDetails(
  conditionId: string
): Promise<PolymarketEvent | null> {
  const res = await fetch(`${GAMMA_API_BASE}/events/${conditionId}`);
  if (!res.ok) return null;

  const event = await res.json();
  return {
    id: event.id,
    conditionId: event.condition_id || event.id,
    title: event.title,
    description: event.description || "",
    endDate: event.end_date_iso,
    category: event.tags?.[0] || "Other",
    outcomes: (event.markets || []).map((m: any) => ({
      name: m.outcome || m.groupItemTitle,
      price: parseFloat(m.outcomePrices?.[0] || "0.5"),
    })),
    volume: parseFloat(event.volume || "0"),
    liquidity: parseFloat(event.liquidity || "0"),
  };
}

/** Categories for filtering */
export const POLYMARKET_CATEGORIES = [
  "Politics",
  "Crypto",
  "Sports",
  "Science",
  "Culture",
  "Business",
  "Tech",
] as const;
