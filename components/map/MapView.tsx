"use client";

// Generic Leaflet map: tiles, an optional route line and colored markers.
// Import it through components/map/index.ts (ssr: false) — Leaflet needs window.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "@/lib/geo/detour";
import { decodePolyline } from "@/lib/geo/polyline";

export type MapMarker = {
  pos: LatLng;
  color: string;      // CSS color of the dot
  label?: string;     // tooltip
  pulse?: boolean;    // animated ring (live vehicle)
};

export type MapViewProps = {
  route?: LatLng[];
  // Encoded route; preferred from server components (much smaller payload).
  polyline?: string | null;
  markers?: MapMarker[];
  // Re-fit the viewport to route + markers whenever this key changes.
  fitKey?: string;
  // Pan to this point whenever it changes (pickers, live tracking).
  focus?: LatLng | null;
  onClick?: (p: LatLng) => void;
  className?: string;
};

const MK_CENTER: [number, number] = [41.6, 21.7];
const MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const tiles = MAPBOX
  ? {
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX}`,
      attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }
  : {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    };

function dotIcon(color: string, pulse?: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<span class="map-dot${pulse ? " map-dot-pulse" : ""}" style="--dot:${color}"></span>`,
  });
}

function FitBounds({ points, fitKey }: { points: LatLng[]; fitKey?: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [32, 32] });
    // Only re-fit when the caller says the content changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);
  return null;
}

function PanTo({ focus }: { focus?: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.panTo([focus.lat, focus.lng], { animate: true });
  }, [map, focus?.lat, focus?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function MapView({ route: routeProp, polyline, markers = [], fitKey, focus, onClick, className }: MapViewProps) {
  const decoded = useMemo(() => decodePolyline(polyline), [polyline]);
  const route = routeProp ?? decoded;
  const fitPoints = [...route, ...markers.map((m) => m.pos)];
  return (
    <MapContainer
      center={MK_CENTER}
      zoom={8}
      scrollWheelZoom={false}
      className={className ?? "h-72 w-full rounded-2xl"}
      style={{ zIndex: 0 }}
    >
      <TileLayer url={tiles.url} attribution={tiles.attribution} />
      {route.length > 1 && (
        <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#0f766e", weight: 5, opacity: 0.8 }} />
      )}
      {markers.map((m, i) => (
        <Marker key={i} position={[m.pos.lat, m.pos.lng]} icon={dotIcon(m.color, m.pulse)}>
          {m.label && <Tooltip direction="top" offset={[0, -10]}>{m.label}</Tooltip>}
        </Marker>
      ))}
      <FitBounds points={fitPoints} fitKey={fitKey} />
      <PanTo focus={focus} />
      {onClick && <ClickHandler onClick={onClick} />}
    </MapContainer>
  );
}
