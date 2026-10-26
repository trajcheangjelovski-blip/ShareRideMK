"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { haversineKm } from "@/lib/geo/detour";

const MIN_INTERVAL_MS = 10_000; // never more often than this
const MAX_INTERVAL_MS = 30_000; // send at least this often (even when parked)
const MIN_MOVE_KM = 0.025;      // ~25 m

// Shares the driver's GPS position while the trip is in progress.
// Approved passengers see it through LiveTracking (Realtime on trip_locations).
export function DriverBroadcaster({ tripId, driverId }: { tripId: string; driverId: string }) {
  const supabase = createClient();
  const [sharing, setSharing] = useState(true);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ at: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!sharing) return;
    if (!navigator.geolocation) {
      setError("Уредот не поддржува GPS локација.");
      return;
    }

    // Mobile browsers pause GPS when the screen sleeps — keep it awake if we can.
    let wakeLock: any = null;
    (navigator as any).wakeLock?.request("screen").then((l: any) => (wakeLock = l)).catch(() => {});

    const watch = navigator.geolocation.watchPosition(
      async (pos) => {
        setError(null);
        const now = Date.now();
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const prev = last.current;
        if (prev) {
          const elapsed = now - prev.at;
          const moved = haversineKm(prev, p);
          if (elapsed < MIN_INTERVAL_MS) return;
          if (moved < MIN_MOVE_KM && elapsed < MAX_INTERVAL_MS) return;
        }
        last.current = { at: now, ...p };
        const { error } = await supabase.from("trip_locations").insert({
          trip_id: tripId,
          driver_id: driverId,
          latitude: p.lat,
          longitude: p.lng,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        });
        if (error) setError("Локацијата не е испратена (дали патувањето е во тек?).");
        else setLastSent(new Date());
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED
          ? "Дозволи пристап до локација за патниците да те следат."
          : "Не може да се добие GPS локација.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watch);
      wakeLock?.release?.().catch?.(() => {});
    };
  }, [sharing, tripId, driverId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 font-semibold text-cyan-900">
          <span className={`h-2.5 w-2.5 rounded-full ${sharing && !error ? "animate-pulse bg-green-500" : "bg-slate-400"}`} />
          {sharing ? "Ја споделуваш локацијата во живо" : "Споделувањето е паузирано"}
        </p>
        <p className="mt-0.5 text-xs text-cyan-800">
          {error ?? (lastSent
            ? `Последно испратено: ${lastSent.toLocaleTimeString("mk-MK")}. Држи ја страницата отворена.`
            : "Се чека GPS сигнал…")}
        </p>
      </div>
      <button type="button" onClick={() => setSharing((s) => !s)}
        className="shrink-0 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-xs font-medium text-cyan-900 hover:bg-cyan-100">
        {sharing ? "Паузирај" : "Продолжи"}
      </button>
    </div>
  );
}
