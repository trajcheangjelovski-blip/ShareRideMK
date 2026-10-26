// Google/OSRM encoded polyline (precision 5) — compact route storage.
import type { LatLng } from "./detour";

export function decodePolyline(str: string | null | undefined): LatLng[] {
  if (!str) return [];
  const out: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    for (const axis of [0, 1]) {
      let result = 0, shift = 0, b: number;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}

// PostGIS EWKT for a geography(LineString,4326) column.
export function toLineStringEWKT(points: LatLng[]): string | null {
  if (points.length < 2) return null;
  return `SRID=4326;LINESTRING(${points.map((p) => `${p.lng} ${p.lat}`).join(",")})`;
}
