"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validations/schemas";
import { computeDetour, type LatLng } from "@/lib/geo/detour";
import { decodePolyline } from "@/lib/geo/polyline";

const tripPath = (id: string) => `/dashboard/passenger/trips/${id}`;
const fail = (tripId: string, msg: string): never =>
  redirect(`${tripPath(tripId)}?error=${encodeURIComponent(msg)}`);

// Passenger: Request to Join. Detour is measured against the stored road
// route (pickup + drop-off), falling back to the straight start→end line.
export async function requestToJoin(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tripId = String(formData.get("trip_id"));

  // Само одобрени профили смеат да поднесуваат барања.
  const { data: me } = await supabase.from("users").select("status").eq("id", user.id).single();
  if (me?.status !== "active") {
    fail(tripId, "Профилот е под дополнителна верификација — не можеш да поднесуваш барања додека не се верифицираш.");
  }

  const str = (k: string) => String(formData.get(k) ?? "").trim() || undefined;
  const parsed = bookingSchema.safeParse({
    seats_requested: Number(formData.get("seats_requested")),
    pickup_address: str("pickup_address"),
    pickup_latitude: Number(formData.get("pickup_latitude")),
    pickup_longitude: Number(formData.get("pickup_longitude")),
    pickup_note: str("pickup_note"),
    dropoff_address: str("dropoff_address"),
    dropoff_latitude: Number(formData.get("dropoff_latitude")),
    dropoff_longitude: Number(formData.get("dropoff_longitude")),
    message: str("message"),
    luggage_info: str("luggage_info"),
  });
  if (!parsed.success) fail(tripId, "Избери место за качување и слегување на мапата.");
  const b = parsed.data!;

  const { data: trip } = await supabase
    .from("trips")
    .select("driver_id, status, available_seats, start_latitude, start_longitude, destination_latitude, destination_longitude, route_polyline, max_detour_minutes")
    .eq("id", tripId)
    .single();
  if (!trip || trip.status !== "published") fail(tripId, "Ова патување повеќе не прима барања.");
  if (trip!.driver_id === user.id) fail(tripId, "Не можеш да резервираш место на своето патување.");
  if (b.seats_requested > trip!.available_seats) fail(tripId, `Има само ${trip!.available_seats} слободни места.`);

  const decoded = decodePolyline(trip!.route_polyline);
  const route: LatLng[] = decoded.length > 1 ? decoded : [
    { lat: trip!.start_latitude, lng: trip!.start_longitude },
    { lat: trip!.destination_latitude, lng: trip!.destination_longitude },
  ];
  const up = computeDetour({ lat: b.pickup_latitude, lng: b.pickup_longitude }, route, trip!.max_detour_minutes);
  const down = computeDetour({ lat: b.dropoff_latitude, lng: b.dropoff_longitude }, route, trip!.max_detour_minutes);
  const detourMinutes = Math.round((up.detourMinutes + down.detourMinutes) * 100) / 100;

  const { error } = await supabase.from("bookings").insert({
    ...b,
    trip_id: tripId,
    passenger_id: user.id,
    detour_minutes_estimate: detourMinutes,
    distance_from_route_km: Math.max(up.distanceFromRouteKm, down.distanceFromRouteKm),
    is_within_driver_detour_limit: detourMinutes <= trip!.max_detour_minutes,
    status: "pending",
  });
  if (error) {
    fail(tripId, error.code === "23505"
      ? "Веќе имаш барање за ова патување."
      : "Барањето не е испратено. Можеби патувањето е полно или веќе не е достапно.");
  }
  redirect(`${tripPath(tripId)}?sent=1`);
}

// Passenger: cancel own pending/approved booking (seats are released by trigger).
export async function cancelBooking(formData: FormData) {
  const supabase = createClient();
  const bookingId = String(formData.get("booking_id"));
  const tripId = String(formData.get("trip_id"));
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled_by_passenger" })
    .eq("id", bookingId);
  if (error) fail(tripId, "Барањето не може да се откаже.");
  revalidatePath(tripPath(tripId));
}
