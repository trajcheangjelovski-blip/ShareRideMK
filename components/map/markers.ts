// Marker colors used across the app. Kept out of the "use client" map module:
// a server component that imports a plain value from a client module gets an
// opaque client reference instead of the value, and rendering fails.
export const MARKER = {
  start: "#0f766e",
  end: "#155e75",
  pickup: "#16a34a",
  dropoff: "#dc2626",
  vehicle: "#f59e0b",
} as const;
