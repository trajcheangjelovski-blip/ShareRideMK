"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSharedPosition } from "@/lib/geo/useSharedPosition";

// Shares the driver's GPS position while the trip is in progress.
// Approved passengers see it through LiveTracking (Realtime on trip_locations).
export function DriverBroadcaster({ tripId, driverId }: { tripId: string; driverId: string }) {
  const supabase = createClient();
  const [sharing, setSharing] = useState(true);
  const { lastSent, error } = useSharedPosition({
    enabled: sharing,
    send: async (p) => {
      const { error } = await supabase.from("trip_locations").insert({
        trip_id: tripId,
        driver_id: driverId,
        latitude: p.lat,
        longitude: p.lng,
        speed: p.speed,
        heading: p.heading,
      });
      return error ? { ok: false, message: "Локацијата не е испратена (дали патувањето е во тек?)." } : { ok: true };
    },
  });

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 font-semibold text-cyan-900">
          <span className={`h-2.5 w-2.5 rounded-full ${sharing && !error ? "animate-pulse bg-green-500" : "bg-slate-400"}`} />
          {sharing ? "Ја споделуваш локацијата во живо" : "Споделувањето е паузирано"}
        </p>
        <p className="mt-0.5 text-xs text-cyan-800">
          {error ?? (lastSent
            ? `Последно испратено: ${lastSent.toTimeString().slice(0, 8)}. Држи ја страницата отворена.`
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
