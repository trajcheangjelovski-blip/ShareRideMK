// Search ranking — section 21 of the blueprint.
// RULE: route-match is a precondition for any promotion boost. A promoted
// trip that does not match the requested route never floats to the top.

export type RankableTrip = {
  id: string;
  departure_time: string;       // "HH:MM"
  price_per_seat: number;
  available_seats: number;
  driver_rating: number;        // 0..5
  is_promoted: boolean;
  promotion_priority: number;   // 0..n
  // matching signals (computed during search):
  exactRouteMatch: boolean;     // start+end city match exactly
  segmentMatch: boolean;        // requested leg covered via waypoints
  detourMinutes: number;        // detour for requested pickup/dropoff
};

export type RankContext = {
  requestedTime?: string;       // "HH:MM"
  sortBy?: "relevance" | "price" | "time" | "rating";
};

const W = { promo: 1000, time: 50, rating: 30, detour: 40, price: 25 };

export function scoreTrip(t: RankableTrip, ctx: RankContext): number {
  const promoQualified = (t.exactRouteMatch || t.segmentMatch) && t.is_promoted;
  let score = 0;

  // 1 & 2: promoted + route-matched rides rank first (exact > segment)
  if (promoQualified) {
    score += W.promo * (t.promotion_priority + 1) * (t.exactRouteMatch ? 2 : 1);
  }

  // 3: time proximity
  if (ctx.requestedTime) {
    const diff = Math.abs(minutes(t.departure_time) - minutes(ctx.requestedTime));
    score += W.time * (1 / (1 + diff / 60));
  }

  // 4: driver rating
  score += W.rating * (t.driver_rating / 5);

  // 5: smaller detour is better
  score += W.detour * (1 / (1 + t.detourMinutes));

  // 6: price (only when explicitly sorting by price)
  if (ctx.sortBy === "price") {
    score -= W.price * normalizePrice(t.price_per_seat);
  }
  return score;
}

// Returns two sections: promoted (route-matched) and all.
export function rankSearchResults(trips: RankableTrip[], ctx: RankContext) {
  const scored = trips
    .map((t) => ({ trip: t, score: scoreTrip(t, ctx) }))
    .sort((a, b) => b.score - a.score);

  const promoted = scored
    .filter((s) => s.trip.is_promoted && (s.trip.exactRouteMatch || s.trip.segmentMatch))
    .map((s) => s.trip);

  const all = scored.map((s) => s.trip);
  return { promoted, all };
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
function normalizePrice(p: number): number {
  return Math.min(1, p / 2000); // assume ~2000 MKD ceiling for normalization
}
