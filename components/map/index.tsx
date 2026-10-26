"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map only renders in the browser.
export const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-slate-100" />,
});

export type { MapMarker, MapViewProps } from "./MapView";
// Marker colors live in ./markers (importable from server components).
