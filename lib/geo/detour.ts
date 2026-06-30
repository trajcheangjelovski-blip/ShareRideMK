// Detour / route-matching helpers.
// MVP: Haversine + point-to-polyline distance. For production accuracy,
// call the Mapbox/Google Directions API with the pickup as a waypoint.

export type LatLng = { lat: number; lng: number };

const R = 6371; // km

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

// Shortest distance (km) from a point to a polyline (array of LatLng).
export function distanceToRouteKm(point: LatLng, route: LatLng[]): number {
  if (route.length === 0) return Infinity;
  if (route.length === 1) return haversineKm(point, route[0]);
  let min = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    min = Math.min(min, distanceToSegmentKm(point, route[i], route[i + 1]));
  }
  return min;
}

// Approximate point-to-segment distance using an equirectangular projection
// (accurate enough at country scale).
function distanceToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const proj = (q: LatLng) => ({
    x: toRad(q.lng) * Math.cos(toRad((a.lat + b.lat) / 2)) * R,
    y: toRad(q.lat) * R,
  });
  const P = proj(p), A = proj(a), B = proj(b);
  const dx = B.x - A.x, dy = B.y - A.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = A.x + t * dx, cy = A.y + t * dy;
  return Math.hypot(P.x - cx, P.y - cy);
}

// Rough detour estimate (minutes): there-and-back along an access road.
export function estimateDetourMinutes(
  distanceFromRouteKm: number,
  avgAccessSpeedKmh = 40,
): number {
  return Math.round(((distanceFromRouteKm * 2) / avgAccessSpeedKmh) * 60 * 100) / 100;
}

export type DetourResult = {
  distanceFromRouteKm: number;
  detourMinutes: number;
  withinLimit: boolean;
};

export function computeDetour(
  pickup: LatLng,
  route: LatLng[],
  maxDetourMinutes: number,
): DetourResult {
  const distanceFromRouteKm = round3(distanceToRouteKm(pickup, route));
  const detourMinutes = estimateDetourMinutes(distanceFromRouteKm);
  return {
    distanceFromRouteKm,
    detourMinutes,
    withinLimit: detourMinutes <= maxDetourMinutes,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
