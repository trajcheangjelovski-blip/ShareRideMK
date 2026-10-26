import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestToJoin, cancelBooking } from "@/lib/actions/bookings";
import { submitReview } from "@/lib/actions/reviews";
import { formatDate, formatTime, fullName } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { MapView } from "@/components/map";
import { MARKER } from "@/components/map/markers";
import { BookingFields } from "@/components/map/BookingFields";
import { Chat } from "@/components/realtime/Chat";
import { LiveTracking } from "@/components/realtime/LiveTracking";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReviewList } from "@/components/reviews/ReviewList";

const LIVE = ["driver_on_the_way", "arrived_at_pickup", "passenger_picked_up", "in_progress"];

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { sent?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trip } = await supabase
    .from("trips")
    .select("*, start_city:start_city_id(name), end_city:end_city_id(name), vehicle:vehicle_id(make, model, color, has_ac)")
    .eq("id", params.id)
    .maybeSingle();
  const t: any = trip;
  if (!t) {
    return (
      <div className="max-w-xl rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
        Патувањето не е пронајдено или повеќе не е достапно.{" "}
        <Link href="/dashboard/passenger/find" className="font-medium text-brand-dark hover:underline">Најди друг превоз</Link>
      </div>
    );
  }
  if (t.driver_id === user!.id) redirect(`/dashboard/driver/trips/${t.id}`);

  const [{ data: driver }, { data: driverStats }, { data: booking }] = await Promise.all([
    supabase.from("public_profiles").select("id, first_name, last_initial, profile_image, created_at").eq("id", t.driver_id).maybeSingle(),
    supabase.from("driver_profiles").select("rating_average, total_trips").eq("user_id", t.driver_id).maybeSingle(),
    supabase.from("bookings").select("*").eq("trip_id", t.id).eq("passenger_id", user!.id).maybeSingle(),
  ]);

  const live = booking?.status === "approved" && LIVE.includes(t.status);
  const [{ data: lastLoc }, { data: myReview }] = await Promise.all([
    live
      ? supabase.from("trip_locations").select("latitude, longitude, recorded_at").eq("trip_id", t.id)
          .order("recorded_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    booking?.status === "completed"
      ? supabase.from("reviews").select("id").eq("booking_id", booking.id).eq("reviewer_id", user!.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const start = { lat: t.start_latitude, lng: t.start_longitude, label: t.start_address || t.start_city?.name };
  const dest = { lat: t.destination_latitude, lng: t.destination_longitude, label: t.destination_address || t.end_city?.name };
  const pickup = booking ? { lat: booking.pickup_latitude, lng: booking.pickup_longitude } : undefined;
  const dropoff = booking ? { lat: booking.dropoff_latitude, lng: booking.dropoff_longitude } : undefined;
  const driverName = fullName(driver);
  const canBook = !booking && t.status === "published" && t.available_seats > 0;
  const canChat = booking && ["pending", "approved", "completed"].includes(booking.status);
  const canCancel = booking && ["pending", "approved"].includes(booking.status) && !LIVE.includes(t.status) && t.status !== "completed";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="page-title">{t.start_city?.name} → {t.end_city?.name}</h1>
          {t.status !== "published" && <StatusBadge status={t.status} />}
        </div>
        <p className="mt-1 text-slate-500">{formatDate(t.departure_date)} · {formatTime(t.departure_time)}</p>
      </div>

      {searchParams.sent && (
        <p className="alert-success">
          Барањето е испратено. Ќе добиеш известување кога возачот ќе одговори — во меѓувреме можеш да му пишеш подолу.
        </p>
      )}
      {searchParams.error && <p className="alert-error">{searchParams.error}</p>}

      {live ? (
        <LiveTracking tripId={t.id} routePolyline={t.route_polyline} start={start} dest={dest}
          pickup={pickup} dropoff={dropoff} initial={lastLoc} />
      ) : (
        <MapView
          polyline={t.route_polyline}
          route={t.route_polyline ? undefined : [start, dest]}
          fitKey="trip"
          markers={[
            { pos: start, color: MARKER.start, label: `Поаѓање: ${start.label}` },
            { pos: dest, color: MARKER.end, label: `Дестинација: ${dest.label}` },
            ...(pickup ? [{ pos: pickup, color: MARKER.pickup, label: "Твое качување" }] : []),
            ...(dropoff ? [{ pos: dropoff, color: MARKER.dropoff, label: "Твое слегување" }] : []),
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Info label="Цена по место" value={`${Number(t.price_per_seat)} ден`} />
        <Info label="Слободни места" value={t.available_seats} />
        <Info label="Возило" value={t.vehicle ? `${t.vehicle.make} ${t.vehicle.model}${t.vehicle.color ? ` · ${t.vehicle.color}` : ""}` : "—"} />
        <Info label="Поаѓање" value={start.label} />
        <Info label="Дестинација" value={dest.label} />
        <Info label="Правила" value={[
          t.vehicle?.has_ac && "клима",
          t.luggage_allowed ? "багаж ✓" : "без багаж",
          t.smoking_allowed ? "пушење ✓" : "без пушење",
          t.pets_allowed && "миленици ✓",
        ].filter(Boolean).join(" · ")} />
      </div>

      {(t.route_description || t.notes) && (
        <div className="space-y-2 rounded-2xl border p-4 text-sm">
          {t.route_description && <p><span className="font-medium">Рута: </span><span className="text-slate-600">{t.route_description}</span></p>}
          {t.notes && <p><span className="font-medium">Белешка од возачот: </span><span className="text-slate-600">{t.notes}</span></p>}
        </div>
      )}

      {/* Booking state */}
      {booking && (
        <div className="flex flex-col gap-3 card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="flex items-center gap-2 font-semibold">Твое барање <StatusBadge status={booking.status} /></p>
            <p className="mt-1 text-slate-500">
              {booking.seats_requested} место(а) · {booking.pickup_address || "качување на мапата"} → {booking.dropoff_address || "слегување на мапата"}
            </p>
          </div>
          {canCancel && (
            <form action={cancelBooking}>
              <input type="hidden" name="booking_id" value={booking.id} />
              <input type="hidden" name="trip_id" value={t.id} />
              <button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Откажи
              </button>
            </form>
          )}
        </div>
      )}

      {booking?.status === "completed" && !myReview && (
        <ReviewForm action={submitReview} bookingId={booking.id} reviewType="passenger_to_driver" otherName={driverName} />
      )}
      {booking?.status === "completed" && myReview && (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Ти благодариме — ја оцени возачот за ова патување.</p>
      )}

      {canChat && (
        <Chat bookingId={booking.id} tripId={t.id} meId={user!.id} otherId={t.driver_id}
          otherName={driver?.first_name ?? "возачот"} readOnly={booking.status === "completed"} />
      )}

      {canBook && (
        <form action={requestToJoin} className="space-y-4 card p-4 shadow-soft sm:p-5">
          <input type="hidden" name="trip_id" value={t.id} />
          <div>
            <h2 className="font-semibold">Испрати барање за превоз</h2>
            <p className="text-xs text-slate-500">Возачот го прифаќа или одбива барањето. Ќе добиеш известување.</p>
          </div>
          <BookingFields routePolyline={t.route_polyline} start={start} dest={dest} maxDetourMinutes={t.max_detour_minutes} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="text-sm sm:w-40">
              <span className="mb-1 block text-slate-600">Места</span>
              <select name="seats_requested" defaultValue={1} className="input">
                {Array.from({ length: Math.min(t.available_seats, 8) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-slate-600">Порака до возачот (опционално)</span>
              <input name="message" maxLength={300} placeholder="Пр. Имам еден мал куфер."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
          </div>
          <button className="btn-primary">Испрати барање</button>
        </form>
      )}
      {!booking && !canBook && (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Ова патување повеќе не прима барања.</p>
      )}

      {/* Driver */}
      <section className="space-y-4 card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Avatar src={driver?.profile_image} size={48} />
          <div>
            <p className="font-semibold">{driverName}</p>
            <p className="text-xs text-slate-500">
              Возач · {driverStats?.total_trips ?? 0} завршени патувања
              {driver?.created_at && ` · член од ${new Date(driver.created_at).getFullYear()}`}
            </p>
          </div>
        </div>
        <ReviewList userId={t.driver_id} type="passenger_to_driver" title="Оценки од патници" />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
