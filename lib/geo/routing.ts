// Driving routes via OSRM. Works on server and client (OSRM sends CORS headers).
// The public demo server is fine for development / low traffic; for production
// point NEXT_PUBLIC_OSRM_URL at a self-hosted OSRM (or swap this file for
// Mapbox Directions). Callers must handle `null` (network error, no route).
import type { LatLng } from "./detour";
import { decodePolyline } from "./polyline";

const OSRM = process.env.NEXT_PUBLIC_OSRM_URL || "https://router.project-osrm.org";

export type Route = {
  polyline: string;      // encoded, precision 5
  points: LatLng[];
  distanceKm: number;
  durationMin: number;
  legsMin: number[];     // duration of each stop-to-stop leg
};

export async function getDrivingRoute(stops: LatLng[]): Promise<Route | null> {
  if (stops.length < 2) return null;
  const coords = stops.map((p) => `${p.lng},${p.lat}`).join(";");
  try {
    const res = await fetch(
      `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=polyline`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.routes?.[0];
    if (json?.code !== "Ok" || !r?.geometry) return null;
    return {
      polyline: r.geometry,
      points: decodePolyline(r.geometry),
      distanceKm: Math.round(r.distance / 100) / 10,
      durationMin: Math.round(r.duration / 60),
      legsMin: (r.legs ?? []).map((l: any) => Math.round(l.duration / 60)),
    };
  } catch {
    return null;
  }
}
