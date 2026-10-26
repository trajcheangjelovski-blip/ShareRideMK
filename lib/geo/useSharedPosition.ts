"use client";

import { useEffect, useRef, useState } from "react";
import { haversineKm, type LatLng } from "./detour";

const MIN_INTERVAL_MS = 10_000; // never send more often than this
const MAX_INTERVAL_MS = 30_000; // send at least this often (even when standing still)
const MIN_MOVE_KM = 0.025;      // ~25 m

export type SendResult = { ok: true } | { ok: false; message: string };

// Watches GPS while `enabled` and calls `send` throttled by time and distance.
// Keeps the screen awake where supported: mobile browsers pause GPS when it sleeps.
export function useSharedPosition({
  enabled,
  send,
}: {
  enabled: boolean;
  send: (p: LatLng & { accuracy: number | null; speed: number | null; heading: number | null }) => Promise<SendResult>;
}) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ at: number; lat: number; lng: number } | null>(null);
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (!enabled) {
      last.current = null;
      return;
    }
    if (!navigator.geolocation) {
      setError("Уредот не поддржува GPS локација.");
      return;
    }

    let wakeLock: any = null;
    (navigator as any).wakeLock?.request("screen").then((l: any) => (wakeLock = l)).catch(() => {});

    const watch = navigator.geolocation.watchPosition(
      async (pos) => {
        setError(null);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(p);
        const now = Date.now();
        const prev = last.current;
        if (prev) {
          const elapsed = now - prev.at;
          if (elapsed < MIN_INTERVAL_MS) return;
          if (haversineKm(prev, p) < MIN_MOVE_KM && elapsed < MAX_INTERVAL_MS) return;
        }
        last.current = { at: now, ...p };
        const r = await sendRef.current({
          ...p,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
        });
        if (r.ok) setLastSent(new Date());
        else setError(r.message);
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED
          ? "Дозволи пристап до локацијата во прелистувачот."
          : "Не може да се добие GPS локација.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watch);
      wakeLock?.release?.().catch?.(() => {});
    };
  }, [enabled]);

  return { position, lastSent, error };
}
