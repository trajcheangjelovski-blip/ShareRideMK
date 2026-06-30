import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeDetour, type LatLng } from "@/lib/geo/detour";

// --- Server action: Request to Join ---
async function requestToJoin(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tripId = String(formData.get("trip_id"));
  const seats = Number(formData.get("seats_requested"));
  const pickupLat = Number(formData.get("pickup_latitude"));
  const pickupLng = Number(formData.get("pickup_longitude"));
  const dropoffLat = Number(formData.get("dropoff_latitude"));
  const dropoffLng = Number(formData.get("dropoff_longitude"));
  const message = String(formData.get("message") ?? "");

  // Build a simple 2-point route (start→end) for the MVP detour estimate.
  const { data: trip } = await supabase
    .from("trips")
    .select("start_latitude,start_longitude,destination_latitude,destination_longitude,max_detour_minutes")
    .eq("id", tripId)
    .single();

  let detour = { distanceFromRouteKm: 0, detourMinutes: 0, withinLimit: true };
  if (trip) {
    const route: LatLng[] = [
      { lat: trip.start_latitude, lng: trip.start_longitude },
      { lat: trip.destination_latitude, lng: trip.destination_longitude },
    ];
    detour = computeDetour({ lat: pickupLat, lng: pickupLng }, route, trip.max_detour_minutes);
  }

  await supabase.from("bookings").insert({
    trip_id: tripId,
    passenger_id: user.id,
    seats_requested: seats,
    pickup_latitude: pickupLat,
    pickup_longitude: pickupLng,
    dropoff_latitude: dropoffLat,
    dropoff_longitude: dropoffLng,
    message,
    detour_minutes_estimate: detour.detourMinutes,
    distance_from_route_km: detour.distanceFromRouteKm,
    is_within_driver_detour_limit: detour.withinLimit,
    status: "pending",
  });

  redirect("/dashboard/passenger/trips?sent=1");
}

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select(
      "*, start_city:start_city_id(name), end_city:end_city_id(name), " +
        "vehicle:vehicle_id(make,model,color,has_ac)"
    )
    .eq("id", params.id)
    .single();

  if (!trip) return <p>Патувањето не е пронајдено.</p>;

  // driver_profiles is keyed by user_id; fetch it separately.
  const { data: driver } = await supabase
    .from("driver_profiles")
    .select("rating_average,total_trips")
    .eq("user_id", trip.driver_id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">
        {trip.start_city?.name} → {trip.end_city?.name}
      </h1>
      <p className="mt-1 text-slate-500">
        {trip.departure_date} · {trip.departure_time?.slice(0, 5)}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <Info label="Цена по место" value={`${trip.price_per_seat} ден`} />
        <Info label="Слободни места" value={trip.available_seats} />
        <Info label="Возило" value={`${trip.vehicle?.make ?? ""} ${trip.vehicle?.model ?? ""} ${trip.vehicle?.has_ac ? "· клима" : ""}`} />
        <Info label="Оцена на возач" value={`★ ${Number(driver?.rating_average ?? 0).toFixed(1)} (${driver?.total_trips ?? 0})`} />
        <Info label="Багаж" value={trip.luggage_allowed ? "Дозволен" : "Не"} />
        <Info label="Макс. скршнување" value={`${trip.max_detour_minutes} мин`} />
      </div>

      {trip.route_description && (
        <div className="mt-4 rounded-xl border p-4 text-sm">
          <p className="font-medium">Рута</p>
          <p className="mt-1 text-slate-600">{trip.route_description}</p>
        </div>
      )}

      {/* Request to Join */}
      <form action={requestToJoin} className="mt-8 rounded-xl border p-4">
        <input type="hidden" name="trip_id" value={trip.id} />
        <h2 className="font-medium">Испрати барање</h2>
        <p className="mt-1 text-xs text-slate-500">
          Внеси pickup/dropoff координати (MVP — подоцна преку мапа).
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <input name="seats_requested" type="number" min={1} max={8} defaultValue={1}
            placeholder="Места" className="rounded-lg border px-3 py-2" />
          <div />
          <input name="pickup_latitude" placeholder="Pickup lat" className="rounded-lg border px-3 py-2" />
          <input name="pickup_longitude" placeholder="Pickup lng" className="rounded-lg border px-3 py-2" />
          <input name="dropoff_latitude" placeholder="Dropoff lat" className="rounded-lg border px-3 py-2" />
          <input name="dropoff_longitude" placeholder="Dropoff lng" className="rounded-lg border px-3 py-2" />
        </div>
        <textarea name="message" placeholder="Порака до возачот"
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
        <button className="mt-3 rounded-lg bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark">
          Request to Join
        </button>
      </form>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
