"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MapView } from "@/components/map";
import { MARKER } from "@/components/map/markers";
import { decodePolyline } from "@/lib/geo/polyline";
import { haversineKm, type LatLng } from "@/lib/geo/detour";
import { getDrivingRoute } from "@/lib/geo/routing";
import { useSharedPosition } from "@/lib/geo/useSharedPosition";

type Loc = { latitude: number; longitude: number; recorded_at: string };

const ETA_REFRESH_MS = 30_000;
const AT_PICKUP_KM = 0.3;
const STALE_MS = 2 * 60_000;

// Live vehicle position for an in-progress trip (Realtime on trip_locations).
// Shows ETA to the passenger's pickup, then to their drop-off. The passenger
// can opt in to share their own position with the driver (passenger_locations).
export function LiveTracking({
  tripId,
  bookingId,
  passengerId,
  routePolyline,
  start,
  dest,
  pickup,
  dropoff,
  initial,
}: {
  tripId: string;
  bookingId: string;
  passengerId: string;
  routePolyline: string | null;
  start: LatLng;
  dest: LatLng;
  pickup?: LatLng;
  dropoff?: LatLng;
  initial?: Loc | null;
}) {
  const supabase = createClient();
  const [loc, setLoc] = useState<Loc | null>(initial ?? null);
  const shareKey = `share-location:${bookingId}`;
  const [sharing, setSharing] = useState(false);

  // Remember the passenger's choice across reloads (per booking).
  useEffect(() => {
    try {
      if (localStorage.getItem(shareKey) === "1") setSharing(true);
    } catch { /* storage unavailable */ }
  }, [shareKey]);

  const me = useSharedPosition({
    enabled: sharing,
    send: async (p) => {
      const { error } = await supabase.from("passenger_locations").upsert(
        { booking_id: bookingId, trip_id: tripId, passenger_id: passengerId, latitude: p.lat, longitude: p.lng, accuracy: p.accuracy, is_sharing: true },
        { onConflict: "booking_id" },
      );
      return error ? { ok: false, message: "Локацијата не е споделена со возачот." } : { ok: true };
    },
  });

  async function toggleSharing() {
    const next = !sharing;
    setSharing(next);
    try { localStorage.setItem(shareKey, next ? "1" : "0"); } catch { /* storage unavailable */ }
    if (!next) {
      // Wipe the stored position so the driver no longer has it.
      await supabase.from("passenger_locations")
        .update({ is_sharing: false, latitude: null, longitude: null, accuracy: null })
        .eq("booking_id", bookingId);
    }
  }
  const [eta, setEta] = useState<{ pickup?: number; dropoff?: number } | null>(null);
  const [passedPickup, setPassedPickup] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lastEta = useRef(0);
  const route = useRef(decodePolyline(routePolyline)).current;

  useEffect(() => {
    const channel = supabase
      .channel(`track:${tripId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trip_locations", filter: `trip_id=eq.${tripId}` },
        (payload) => setLoc(payload.new as Loc),
      )
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const vehicle = loc ? { lat: loc.latitude, lng: loc.longitude } : null;

  // Once the car has been at the pickup, only the drop-off ETA matters.
  useEffect(() => {
    if (vehicle && pickup && !passedPickup && haversineKm(vehicle, pickup) < AT_PICKUP_KM) {
      lastEta.current = 0; // recompute right away for the drop-off leg
      setPassedPickup(true);
    }
  }, [vehicle?.lat, vehicle?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!vehicle || Date.now() - lastEta.current < ETA_REFRESH_MS) return;
    lastEta.current = Date.now();
    const target = dropoff ?? dest;
    const stops = pickup && !passedPickup ? [vehicle, pickup, target] : [vehicle, target];
    getDrivingRoute(stops).then((r) => {
      // Fallback: straight line × 1.3 at 60 km/h.
      const guess = (a: LatLng, b: LatLng) => Math.round((haversineKm(a, b) * 1.3) / 60 * 60);
      if (pickup && !passedPickup) {
        setEta({
          pickup: r?.legsMin[0] ?? guess(vehicle, pickup),
          dropoff: r ? r.durationMin : guess(vehicle, pickup) + guess(pickup, target),
        });
      } else {
        setEta({ dropoff: r?.durationMin ?? guess(vehicle, target) });
      }
    });
  }, [vehicle?.lat, vehicle?.lng, passedPickup]); // eslint-disable-line react-hooks/exhaustive-deps

  const age = loc ? now - new Date(loc.recorded_at).getTime() : null;
  const stale = age != null && age > STALE_MS;

  const markers = [
    { pos: start, color: MARKER.start, label: "Поаѓање" },
    { pos: dest, color: MARKER.end, label: "Дестинација" },
    ...(pickup ? [{ pos: pickup, color: MARKER.pickup, label: "Твое качување" }] : []),
    ...(dropoff ? [{ pos: dropoff, color: MARKER.dropoff, label: "Твое слегување" }] : []),
    ...(vehicle ? [{ pos: vehicle, color: MARKER.vehicle, label: "Возилото", pulse: !stale }] : []),
    ...(sharing && me.position ? [{ pos: me.position, color: MARKER.passenger, label: "Ти" }] : []),
  ];

  return (
    <div className="overflow-hidden card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <span className={`h-2.5 w-2.5 rounded-full ${vehicle && !stale ? "animate-pulse bg-green-500" : "bg-slate-300"}`} />
          Следење во живо
        </p>
        <p className="text-xs text-slate-500">
          {!vehicle ? "Се чека првата локација од возачот…"
            : stale ? "Нема свежа локација — возачот можеби е без сигнал."
            : `Ажурирано пред ${Math.max(0, Math.round((age ?? 0) / 1000))} сек`}
        </p>
      </div>
      <MapView route={route} markers={markers} fitKey={vehicle ? "live" : "route"} focus={vehicle} className="h-80 w-full" />
      {eta && vehicle && (
        <div className="grid grid-cols-2 divide-x border-t text-center text-sm">
          <div className="p-3">
            <p className="text-xs text-slate-500">До твоето качување</p>
            <p className="text-lg font-bold text-brand-dark">
              {pickup ? (passedPickup ? "✓ Стигна" : `~${eta.pickup ?? "–"} мин`) : "–"}
            </p>
          </div>
          <div className="p-3">
            <p className="text-xs text-slate-500">До слегување</p>
            <p className="text-lg font-bold text-brand-dark">~{eta.dropoff ?? "–"} мин</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 border-t bg-slate-50/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: sharing ? MARKER.passenger : "#cbd5e1" }} />
            {sharing ? "Ја споделуваш твојата локација" : "Твојата локација не е споделена"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {sharing
              ? me.error ?? (me.lastSent ? "Возачот те гледа на мапата. Држи ја страницата отворена." : "Се чека GPS сигнал…")
              : "Сподели ја за возачот полесно да те најде. Ја гледа само возачот, само додека трае патувањето."}
          </p>
        </div>
        <button type="button" onClick={toggleSharing}
          className={sharing ? "btn-secondary shrink-0" : "btn-primary shrink-0 !px-4 !py-2 text-sm"}>
          {sharing ? "Престани да споделуваш" : "Сподели ја мојата локација"}
        </button>
      </div>
    </div>
  );
}
