"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MapView } from "@/components/map";
import { MARKER } from "@/components/map/markers";
import { haversineKm, type LatLng } from "@/lib/geo/detour";

type Passenger = { bookingId: string; name: string; pickup: LatLng; dropoff: LatLng };
type PassengerLoc = { booking_id: string; latitude: number | null; longitude: number | null; is_sharing: boolean; updated_at: string };

const STALE_MS = 3 * 60_000;

// Driver's view of an in-progress trip: own vehicle position plus the live
// position of each approved passenger who chose to share (passenger_locations).
export function DriverLiveMap({
  tripId,
  routePolyline,
  start,
  dest,
  passengers,
}: {
  tripId: string;
  routePolyline: string | null;
  start: LatLng;
  dest: LatLng;
  passengers: Passenger[];
}) {
  const supabase = createClient();
  const [locs, setLocs] = useState<Record<string, PassengerLoc>>({});
  const [vehicle, setVehicle] = useState<LatLng | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    supabase.from("passenger_locations")
      .select("booking_id, latitude, longitude, is_sharing, updated_at")
      .eq("trip_id", tripId)
      .then(({ data }) => {
        if (active) setLocs(Object.fromEntries((data ?? []).map((r: PassengerLoc) => [r.booking_id, r])));
      });
    supabase.from("trip_locations")
      .select("latitude, longitude").eq("trip_id", tripId)
      .order("recorded_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (active && data) setVehicle({ lat: data.latitude, lng: data.longitude }); });

    const upsert = (r: PassengerLoc) => setLocs((prev) => ({ ...prev, [r.booking_id]: r }));
    const channel = supabase
      .channel(`driver-live:${tripId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "passenger_locations", filter: `trip_id=eq.${tripId}` },
        (p) => upsert(p.new as PassengerLoc))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "passenger_locations", filter: `trip_id=eq.${tripId}` },
        (p) => upsert(p.new as PassengerLoc))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trip_locations", filter: `trip_id=eq.${tripId}` },
        (p) => setVehicle({ lat: (p.new as any).latitude, lng: (p.new as any).longitude }))
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 10_000);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const live = passengers.map((p) => {
    const l = locs[p.bookingId];
    const pos = l?.is_sharing && l.latitude != null && l.longitude != null ? { lat: l.latitude, lng: l.longitude } : null;
    const age = l ? now - new Date(l.updated_at).getTime() : null;
    return { ...p, pos, age, stale: age != null && age > STALE_MS };
  });

  const markers = [
    { pos: start, color: MARKER.start, label: "Поаѓање" },
    { pos: dest, color: MARKER.end, label: "Дестинација" },
    ...passengers.flatMap((p) => [
      { pos: p.pickup, color: MARKER.pickup, label: `Качување: ${p.name}` },
      { pos: p.dropoff, color: MARKER.dropoff, label: `Слегување: ${p.name}` },
    ]),
    ...live.filter((p) => p.pos && !p.stale).map((p) => ({ pos: p.pos!, color: MARKER.passenger, label: `${p.name} (во живо)`, pulse: true })),
    ...(vehicle ? [{ pos: vehicle, color: MARKER.vehicle, label: "Ти (возилото)" }] : []),
  ];

  return (
    <div className="overflow-hidden card">
      <MapView polyline={routePolyline} route={routePolyline ? undefined : [start, dest]} markers={markers} fitKey="driver-live" className="h-80 w-full" />
      {passengers.length > 0 && (
        <ul className="divide-y divide-slate-100 border-t text-sm">
          {live.map((p) => (
            <li key={p.bookingId} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: p.pos && !p.stale ? MARKER.passenger : "#cbd5e1" }} />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {!p.pos ? "не ја споделува локацијата"
                  : p.stale ? "нема свежа локација"
                  : `во живо · пред ${Math.max(0, Math.round((p.age ?? 0) / 1000))} сек`
                    + (vehicle ? ` · ${haversineKm(vehicle, p.pos).toFixed(1)} км од тебе` : "")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
