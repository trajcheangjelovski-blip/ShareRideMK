// Demo data for a LOCAL Supabase (`supabase start`). Never run against production.
//
//   node scripts/seed-demo.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
// Safe to re-run: accounts are reused, demo trips are recreated.
//
// Demo logins (local only):
//   admin@demo.mk   / demo12345   — admin panel
//   vozac@demo.mk   / demo12345   — driver (also passenger)
//   patnik@demo.mk  / demo12345   — passenger
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
if (!/127\.0\.0\.1|localhost/.test(URL_)) throw new Error(`Refusing to seed a non-local Supabase: ${URL_}`);

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const PASSWORD = "demo12345";

async function api(path, init = {}) {
  const res = await fetch(`${URL_}${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function authUser(email) {
  try {
    const u = await api("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
    });
    return u.id;
  } catch {
    const { users } = await api("/auth/v1/admin/users?per_page=200");
    const u = users.find((x) => x.email === email);
    if (!u) throw new Error(`Could not create or find ${email}`);
    return u.id;
  }
}

const upsert = (table, rows, onConflict) =>
  api(`/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });

function decodePolyline(str) {
  const out = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let r = 0, s = 0, b;
      do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
      const d = r & 1 ? ~(r >> 1) : r >> 1;
      if (axis === 0) lat += d; else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

async function route(a, b) {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=polyline`, { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const g = j?.routes?.[0]?.geometry;
    if (!g) return {};
    const pts = decodePolyline(g);
    return { route_polyline: g, route_geom: `SRID=4326;LINESTRING(${pts.map(([la, ln]) => `${ln} ${la}`).join(",")})` };
  } catch {
    return {}; // offline → straight-line detour fallback
  }
}

const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Skopje" });
};

// ---------- accounts ----------
const people = [
  { email: "admin@demo.mk", first_name: "Ана", last_name: "Админ", role: "admin", is_driver: false },
  { email: "vozac@demo.mk", first_name: "Дарко", last_name: "Петровски", role: "driver", is_driver: true },
  { email: "patnik@demo.mk", first_name: "Петра", last_name: "Николова", role: "passenger", is_driver: false },
];
const ids = {};
for (const p of people) {
  ids[p.email] = await authUser(p.email);
  await upsert("users", [{
    id: ids[p.email], email: p.email, first_name: p.first_name, last_name: p.last_name,
    phone: `07${Math.floor(1000000 + Math.random() * 8999999)}`,
    role: p.role, is_driver: p.is_driver, is_passenger: true, status: "active",
  }], "id");
}
const driver = ids["vozac@demo.mk"];
const passenger = ids["patnik@demo.mk"];
await upsert("driver_profiles", [{ user_id: driver, bio: "Секој ден возам Скопје–Велес за работа." }], "user_id");

// ---------- vehicle ----------
let [vehicle] = await api(`/rest/v1/vehicles?driver_id=eq.${driver}&select=id`);
if (!vehicle) {
  [vehicle] = await api("/rest/v1/vehicles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ driver_id: driver, make: "Škoda", model: "Octavia", year: 2019, color: "Сива", license_plate: "SK-1234-AB", seats: 4, has_ac: true }),
  });
}

// ---------- trips (recreated each run) ----------
await api(`/rest/v1/trips?driver_id=eq.${driver}`, { method: "DELETE" });
const cities = Object.fromEntries((await api("/rest/v1/cities?select=id,name,latitude,longitude")).map((c) => [c.name, c]));
const plans = [
  { from: "Скопје", to: "Велес", date: day(1), time: "08:00", seats: 3, price: 200, notes: "Поаѓам од Аеродром, чекам најмногу 5 минути." },
  { from: "Скопје", to: "Охрид", date: day(2), time: "07:30", seats: 3, price: 600, notes: "Една пауза кај Кичево." },
  { from: "Битола", to: "Скопје", date: day(3), time: "16:00", seats: 2, price: 500 },
];
const trips = [];
for (const t of plans) {
  const a = cities[t.from], b = cities[t.to];
  const start = { lat: a.latitude, lng: a.longitude }, dest = { lat: b.latitude, lng: b.longitude };
  const [trip] = await api("/rest/v1/trips", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      driver_id: driver, vehicle_id: vehicle.id,
      start_city_id: a.id, end_city_id: b.id,
      start_address: `${t.from} (центар)`, start_latitude: start.lat, start_longitude: start.lng,
      destination_address: `${t.to} (центар)`, destination_latitude: dest.lat, destination_longitude: dest.lng,
      departure_date: t.date, departure_time: t.time,
      available_seats: t.seats, total_seats: t.seats, price_per_seat: t.price,
      max_detour_minutes: 10, luggage_allowed: true, notes: t.notes ?? null,
      status: "published",
      ...(await route(start, dest)),
    }),
  });
  trips.push(trip);
}

// A pending request so the driver has something to approve (triggers a notification).
await api("/rest/v1/bookings", {
  method: "POST",
  body: JSON.stringify({
    trip_id: trips[0].id, passenger_id: passenger, seats_requested: 1,
    pickup_address: "Скопје (центар)", pickup_latitude: cities["Скопје"].latitude, pickup_longitude: cities["Скопје"].longitude,
    dropoff_address: "Велес (центар)", dropoff_latitude: cities["Велес"].latitude, dropoff_longitude: cities["Велес"].longitude,
    detour_minutes_estimate: 0, distance_from_route_km: 0, is_within_driver_detour_limit: true,
    message: "Здраво! Имам еден мал ранец.", status: "pending",
  }),
});

console.log(`Seeded: 3 accounts, 1 vehicle, ${trips.length} trips (${trips.filter((t) => t.route_polyline).length} with road routes), 1 pending request.`);
