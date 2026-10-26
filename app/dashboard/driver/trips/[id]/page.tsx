import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setTripStatus, setBookingStatus } from "@/lib/actions/trips";
import { submitReview } from "@/lib/actions/reviews";
import { formatDate, formatTime, fullName } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MapView } from "@/components/map";
import { MARKER } from "@/components/map/markers";
import { Chat } from "@/components/realtime/Chat";
import { DriverBroadcaster } from "@/components/realtime/DriverBroadcaster";
import { DriverLiveMap } from "@/components/realtime/DriverLiveMap";
import { ReviewForm } from "@/components/reviews/ReviewForm";

const LIVE = ["driver_on_the_way", "arrived_at_pickup", "passenger_picked_up", "in_progress"];
const CHAT_OPEN = ["pending", "approved", "completed"];

export default async function DriverTripPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string; error?: string; booking?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trip } = await supabase
    .from("trips")
    .select("*, start_city:start_city_id(name), end_city:end_city_id(name), vehicle:vehicle_id(make, model)")
    .eq("id", params.id)
    .eq("driver_id", user!.id)
    .maybeSingle();
  const t: any = trip;
  if (!t) {
    return <p className="text-sm text-slate-500">Патувањето не е пронајдено.</p>;
  }

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("*")
    .eq("trip_id", t.id)
    .order("created_at");
  const bookings: any[] = bookingRows ?? [];

  const ids = bookings.map((b) => b.passenger_id);
  const [{ data: people }, { data: myReviews }] = await Promise.all([
    ids.length
      ? supabase.from("public_profiles").select("id, first_name, last_initial, profile_image").in("id", ids)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("reviews").select("booking_id").eq("trip_id", t.id).eq("reviewer_id", user!.id),
  ]);
  const personById = new Map((people ?? []).map((p: any) => [p.id, p]));
  const reviewed = new Set((myReviews ?? []).map((r: any) => r.booking_id));

  const live = LIVE.includes(t.status);
  const chatBooking =
    bookings.find((b) => b.id === searchParams.booking && CHAT_OPEN.includes(b.status)) ??
    bookings.find((b) => b.status === "approved") ??
    bookings.find((b) => b.status === "pending");
  const approved = bookings.filter((b) => b.status === "approved" || b.status === "completed");

  const start = { lat: t.start_latitude, lng: t.start_longitude };
  const dest = { lat: t.destination_latitude, lng: t.destination_longitude };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">{t.start_city?.name} → {t.end_city?.name}</h1>
            <StatusBadge status={t.status} />
          </div>
          <p className="mt-1 text-slate-500">
            {formatDate(t.departure_date)} · {formatTime(t.departure_time)} · {t.total_seats - t.available_seats}/{t.total_seats} места зафатени · {Number(t.price_per_seat)} ден/место
          </p>
        </div>
        <Lifecycle trip={t} hasPassengers={approved.length > 0} />
      </div>

      {searchParams.created && (
        <p className="alert-success">
          Патувањето е објавено. Патниците веќе можат да го најдат и да испратат барање.
        </p>
      )}
      {searchParams.error && <p className="alert-error">{searchParams.error}</p>}

      {live && <DriverBroadcaster tripId={t.id} driverId={user!.id} />}

      {live ? (
        <DriverLiveMap
          tripId={t.id}
          routePolyline={t.route_polyline}
          start={start}
          dest={dest}
          passengers={bookings.filter((b) => b.status === "approved").map((b) => ({
            bookingId: b.id,
            name: fullName(personById.get(b.passenger_id)),
            pickup: { lat: b.pickup_latitude, lng: b.pickup_longitude },
            dropoff: { lat: b.dropoff_latitude, lng: b.dropoff_longitude },
          }))}
        />
      ) : (
      <MapView
        polyline={t.route_polyline}
        route={t.route_polyline ? undefined : [start, dest]}
        fitKey="trip"
        markers={[
          { pos: start, color: MARKER.start, label: "Поаѓање" },
          { pos: dest, color: MARKER.end, label: "Дестинација" },
          ...approved.flatMap((b) => {
            const name = fullName(personById.get(b.passenger_id));
            return [
              { pos: { lat: b.pickup_latitude, lng: b.pickup_longitude }, color: MARKER.pickup, label: `Качување: ${name}` },
              { pos: { lat: b.dropoff_latitude, lng: b.dropoff_longitude }, color: MARKER.dropoff, label: `Слегување: ${name}` },
            ];
          }),
        ]}
      />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="font-semibold">Патници и барања</h2>
          <div className="mt-3 space-y-3">
            {bookings.length === 0 && (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                Сè уште нема барања за ова патување.
              </p>
            )}
            {bookings.map((b) => {
              const p = personById.get(b.passenger_id);
              const selected = chatBooking?.id === b.id;
              return (
                <div key={b.id} className={`card p-4 text-sm ${selected ? "ring-2 ring-brand/40" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <Avatar src={p?.profile_image} size={28} /> {fullName(p)} · {b.seats_requested} место(а)
                      </p>
                      <p className="mt-1 text-slate-500">
                        <span className="text-green-700">●</span> {b.pickup_address || "качување на мапата"}{" "}
                        → <span className="text-red-600">●</span> {b.dropoff_address || "слегување на мапата"}
                      </p>
                      {b.detour_minutes_estimate != null && (
                        <p className={`text-xs ${b.is_within_driver_detour_limit ? "text-green-600" : "text-red-600"}`}>
                          Скршнување ~{Number(b.detour_minutes_estimate)} мин · {b.is_within_driver_detour_limit ? "во лимит" : "над лимит"}
                        </p>
                      )}
                      {b.message && <p className="mt-1 italic text-slate-600">„{b.message}“</p>}
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {b.status === "pending" && t.status === "published" && (
                      <>
                        <BookingButton tripId={t.id} bookingId={b.id} status="approved"
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-white hover:bg-green-700">Прифати</BookingButton>
                        <BookingButton tripId={t.id} bookingId={b.id} status="rejected"
                          className="rounded-lg border px-4 py-1.5 hover:bg-slate-50">Одбиј</BookingButton>
                      </>
                    )}
                    {b.status === "approved" && live && (
                      <BookingButton tripId={t.id} bookingId={b.id} status="no_show"
                        className="rounded-lg border px-4 py-1.5 text-slate-600 hover:bg-slate-50">Не се појави</BookingButton>
                    )}
                    {CHAT_OPEN.includes(b.status) && !selected && (
                      <Link href={`?booking=${b.id}#chat`} className="rounded-lg border px-4 py-1.5 hover:bg-slate-50">Разговор</Link>
                    )}
                  </div>

                  {b.status === "completed" && !reviewed.has(b.id) && (
                    <div className="mt-3">
                      <ReviewForm action={submitReview} bookingId={b.id} reviewType="driver_to_passenger" otherName={fullName(p)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside>
          {chatBooking ? (
            <Chat
              key={chatBooking.id}
              bookingId={chatBooking.id}
              tripId={t.id}
              meId={user!.id}
              otherId={chatBooking.passenger_id}
              otherName={personById.get(chatBooking.passenger_id)?.first_name ?? "патникот"}
              readOnly={chatBooking.status === "completed"}
            />
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
              Разговорот со патниците ќе се појави тука.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Lifecycle({ trip, hasPassengers }: { trip: any; hasPassengers: boolean }) {
  const btn = "rounded-xl px-4 py-2 text-sm font-medium transition";
  if (trip.status === "published" || trip.status === "scheduled") {
    return (
      <div className="flex gap-2">
        <form action={setTripStatus}>
          <input type="hidden" name="trip_id" value={trip.id} />
          <input type="hidden" name="status" value="in_progress" />
          <ConfirmButton message="Да започне патувањето? Патниците ќе добијат известување и ќе ја гледаат твојата локација."
            className={`${btn} bg-brand text-white hover:bg-brand-dark`}>Започни патување</ConfirmButton>
        </form>
        <form action={setTripStatus}>
          <input type="hidden" name="trip_id" value={trip.id} />
          <input type="hidden" name="status" value="cancelled" />
          <ConfirmButton message={hasPassengers ? "Да се откаже патувањето? Сите прифатени патници ќе бидат известени." : "Да се откаже патувањето?"}
            className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`}>Откажи</ConfirmButton>
        </form>
      </div>
    );
  }
  if (LIVE.includes(trip.status)) {
    return (
      <form action={setTripStatus}>
        <input type="hidden" name="trip_id" value={trip.id} />
        <input type="hidden" name="status" value="completed" />
        <ConfirmButton message="Да се заврши патувањето? Патниците ќе можат да те оценат."
          className={`${btn} bg-green-600 text-white hover:bg-green-700`}>Заврши патување</ConfirmButton>
      </form>
    );
  }
  return null;
}

function BookingButton({
  tripId, bookingId, status, className, children,
}: {
  tripId: string; bookingId: string; status: string; className: string; children: React.ReactNode;
}) {
  return (
    <form action={setBookingStatus}>
      <input type="hidden" name="trip_id" value={tripId} />
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="status" value={status} />
      <button className={className}>{children}</button>
    </form>
  );
}
