"use client";

import { useEffect, useRef, useState } from "react";
import { MapView } from "./index";
import { reverseGeocode, searchPlaces, type Place } from "@/lib/geo/geocode";
import type { LatLng } from "@/lib/geo/detour";

// Controlled location field: address search, "my location" and click-on-map.
// Submits `${name}_latitude`, `${name}_longitude`, `${name}_address`.
export function LocationPicker({
  name,
  label,
  color,
  value,
  onChange,
  route,
  extraMarkers = [],
  hint,
}: {
  name: string;
  label: string;
  color: string;
  value: Place | null;
  onChange: (p: Place) => void;
  route?: LatLng[];
  extraMarkers?: { pos: LatLng; color: string; label?: string }[];
  hint?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const latInput = useRef<HTMLInputElement>(null);

  // Programmatic value changes don't fire onInput, so clear the message here.
  useEffect(() => {
    latInput.current?.setCustomValidity("");
  }, [value?.lat, value?.lng]);

  // Debounced address search (Nominatim asks for ≤1 req/s).
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      abort.current = new AbortController();
      try {
        setResults(await searchPlaces(query, abort.current.signal));
      } catch {
        /* aborted or offline */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [query]);

  async function pick(p: LatLng, label?: string) {
    setResults([]);
    setQuery("");
    setError(null);
    onChange({ ...p, label: label ?? "Избрана точка" });
    if (!label) {
      const address = await reverseGeocode(p);
      if (address) onChange({ ...p, label: address });
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Прелистувачот не поддржува локација.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        pick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setBusy(false);
        setError("Не може да се пристапи до локацијата. Дозволи пристап или избери на мапата.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const markers = [
    ...extraMarkers,
    ...(value ? [{ pos: value, color, label }] : []),
  ];

  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium text-slate-700">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <button type="button" onClick={useMyLocation} disabled={busy}
          className="text-xs font-medium text-brand-dark hover:underline disabled:opacity-50">
          {busy ? "Се бара…" : "📍 Моја локација"}
        </button>
      </div>

      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // don't submit the outer form
              if (results[0]) pick(results[0], results[0].label);
            }
          }}
          placeholder="Пребарај адреса или кликни на мапата"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lift">
            {results.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => pick(r, r.label)}
                  className="block w-full px-3 py-2 text-left hover:bg-brand/10">
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2">
        <MapView
          route={route}
          markers={markers}
          fitKey={`${route?.length ?? 0}`}
          focus={value}
          onClick={(p) => pick(p)}
          className="h-56 w-full rounded-xl"
        />
      </div>

      <p className={`mt-1.5 text-xs ${value ? "text-slate-600" : "text-slate-400"}`}>
        {value ? value.label : hint ?? "Сè уште не е избрана локација."}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Submitted values. The visually-hidden latitude input is `required`
          so the browser blocks submit until a point is chosen. */}
      <input
        ref={latInput}
        name={`${name}_latitude`}
        value={value?.lat ?? ""}
        onChange={() => {}}
        required
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onInvalid={(e) => e.currentTarget.setCustomValidity(`Избери: ${label.toLowerCase()}`)}
      />
      <input type="hidden" name={`${name}_longitude`} value={value?.lng ?? ""} />
      <input type="hidden" name={`${name}_address`} value={value?.label ?? ""} />
    </div>
  );
}
