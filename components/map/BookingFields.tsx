"use client";

import { useState } from "react";
import { LocationPicker } from "./LocationPicker";
import { MARKER } from "./index";
import { decodePolyline } from "@/lib/geo/polyline";
import { computeDetour, type LatLng } from "@/lib/geo/detour";
import type { Place } from "@/lib/geo/geocode";

// Pickup + drop-off pickers drawn on the trip's route, with a live detour
// estimate against the driver's limit (the server recomputes it on submit).
export function BookingFields({
  routePolyline,
  start,
  dest,
  maxDetourMinutes,
}: {
  routePolyline: string | null;
  start: Place;
  dest: Place;
  maxDetourMinutes: number;
}) {
  const [route] = useState<LatLng[]>(() => {
    const r = decodePolyline(routePolyline);
    return r.length > 1 ? r : [start, dest];
  });
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);

  const tripMarkers = [
    { pos: start, color: MARKER.start, label: "Поаѓање на возачот" },
    { pos: dest, color: MARKER.end, label: "Дестинација на возачот" },
  ];

  const detour = pickup && dropoff
    ? computeDetour(pickup, route, maxDetourMinutes).detourMinutes +
      computeDetour(dropoff, route, maxDetourMinutes).detourMinutes
    : null;
  const within = detour != null && detour <= maxDetourMinutes;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <LocationPicker
          name="pickup" label="Каде да те земе" color={MARKER.pickup}
          value={pickup} onChange={setPickup} route={route}
          extraMarkers={[...tripMarkers, ...(dropoff ? [{ pos: dropoff, color: MARKER.dropoff, label: "Слегување" }] : [])]}
          hint={`Избери точка близу до рутата. Возачот скршнува најмногу ${maxDetourMinutes} мин.`}
        />
        <LocationPicker
          name="dropoff" label="Каде слегуваш" color={MARKER.dropoff}
          value={dropoff} onChange={setDropoff} route={route}
          extraMarkers={[...tripMarkers, ...(pickup ? [{ pos: pickup, color: MARKER.pickup, label: "Качување" }] : [])]}
        />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={() => setPickup({ ...start, label: start.label })}
          className="rounded-full border px-3 py-1 hover:bg-slate-50">Качи ме на поаѓањето</button>
        <button type="button" onClick={() => setDropoff({ ...dest, label: dest.label })}
          className="rounded-full border px-3 py-1 hover:bg-slate-50">Слегувам на дестинацијата</button>
      </div>
      {detour != null && (
        <p className={`rounded-xl px-4 py-2.5 text-sm ${within ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
          Проценето скршнување за возачот: <b>~{Math.round(detour)} мин</b>{" "}
          {within ? "— во рамки на неговиот лимит." : `— над лимитот од ${maxDetourMinutes} мин, возачот може да одбие.`}
        </p>
      )}
    </div>
  );
}
