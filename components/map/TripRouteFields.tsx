"use client";

import { useEffect, useState } from "react";
import { LocationPicker } from "./LocationPicker";
import { MARKER } from "./index";
import { getDrivingRoute, type Route } from "@/lib/geo/routing";
import type { Place } from "@/lib/geo/geocode";

type City = { id: string; name: string; latitude: number | null; longitude: number | null };

// Create-trip: start/end city + exact start/destination points + route preview.
export function TripRouteFields({ cities }: { cities: City[] }) {
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [start, setStart] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [routing, setRouting] = useState(false);

  // Choosing a city drops the pin on its center; the driver can refine it.
  function onCity(id: string, which: "start" | "end") {
    const c = cities.find((x) => x.id === id);
    const center = c?.latitude != null && c.longitude != null
      ? { lat: c.latitude, lng: c.longitude, label: `${c.name} (центар)` }
      : null;
    if (which === "start") { setStartCity(id); if (center) setStart(center); }
    else { setEndCity(id); if (center) setDest(center); }
  }

  useEffect(() => {
    if (!start || !dest) { setRoute(null); return; }
    let cancelled = false;
    setRouting(true);
    const t = setTimeout(async () => {
      const r = await getDrivingRoute([start, dest]);
      if (!cancelled) { setRoute(r); setRouting(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [start?.lat, start?.lng, dest?.lat, dest?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
  const sameCity = startCity !== "" && startCity === endCity;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-slate-600">Почетен град</span>
          <select name="start_city_id" required value={startCity} onChange={(e) => onCity(e.target.value, "start")} className={selectCls}>
            <option value="" disabled>Избери град</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-slate-600">Краен град</span>
          <select name="end_city_id" required value={endCity} onChange={(e) => onCity(e.target.value, "end")} className={selectCls}>
            <option value="" disabled>Избери град</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      {sameCity && <p className="text-xs text-red-600">Почетниот и крајниот град мора да се различни.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <LocationPicker
          name="start" label="Точно место на поаѓање" color={MARKER.start}
          value={start} onChange={setStart} route={route?.points}
          extraMarkers={dest ? [{ pos: dest, color: MARKER.end, label: "Дестинација" }] : []}
          hint="Избери град или кликни на мапата."
        />
        <LocationPicker
          name="destination" label="Точна дестинација" color={MARKER.end}
          value={dest} onChange={setDest} route={route?.points}
          extraMarkers={start ? [{ pos: start, color: MARKER.start, label: "Поаѓање" }] : []}
          hint="Избери град или кликни на мапата."
        />
      </div>

      <div className="rounded-xl bg-brand/5 px-4 py-3 text-sm text-brand-dark">
        {routing ? "Се пресметува рутата…"
          : route ? <>Рута: <b>{route.distanceKm} км</b> · околу <b>{route.durationMin} мин</b> возење. Ќе се зачува со патувањето.</>
          : start && dest ? "Рутата не може да се пресмета — патувањето ќе се зачува со права линија."
          : "Избери поаѓање и дестинација за да ја видиш рутата."}
      </div>
    </div>
  );
}
