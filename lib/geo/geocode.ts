// Address search / reverse lookup via OpenStreetMap Nominatim (browser-side).
// Usage policy: max ~1 request/second, so callers debounce. Results are
// limited to North Macedonia.
import type { LatLng } from "./detour";

const NOMINATIM = "https://nominatim.openstreetmap.org";

export type Place = LatLng & { label: string };

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `${NOMINATIM}/search?format=jsonv2&countrycodes=mk&limit=5&accept-language=mk&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const rows: any[] = await res.json();
  return rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: shorten(r.display_name) }));
}

export async function reverseGeocode(p: LatLng): Promise<string | null> {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&zoom=17&accept-language=mk&lat=${p.lat}&lon=${p.lng}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.display_name ? shorten(json.display_name) : null;
  } catch {
    return null;
  }
}

// Nominatim names are long ("…, Општина …, Скопски Регион, 1000, Северна Македонија").
function shorten(name: string): string {
  return name.split(",").slice(0, 3).map((s) => s.trim()).join(", ");
}
