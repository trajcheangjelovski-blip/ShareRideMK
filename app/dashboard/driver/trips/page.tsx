import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatTime, todayISO } from "@/lib/format";

const ACTIVE = ["draft", "published", "scheduled", "driver_on_the_way", "arrived_at_pickup", "passenger_picked_up", "in_progress"];

export default async function DriverTripsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("trips")
    .select("id, status, departure_date, departure_time, available_seats, total_seats, price_per_seat, start_city:start_city_id(name), end_city:end_city_id(name), bookings(status)")
    .eq("driver_id", user!.id)
    .order("departure_date", { ascending: false })
    .order("departure_time", { ascending: false });
  const trips: any[] = data ?? [];

  const today = todayISO();
  const upcoming = trips.filter((t) => ACTIVE.includes(t.status) && t.departure_date >= today).reverse();
  const past = trips.filter((t) => !upcoming.includes(t));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Мои објави</h1>
        <Link href="/dashboard/driver/create-trip" className="btn-primary !px-4 !py-2 text-sm">Креирај патување</Link>
      </div>

      <TripList title="Претстојни и во тек" trips={upcoming} empty="Немаш претстојни патувања." />
      <TripList title="Претходни" trips={past} empty="Сè уште нема завршени патувања." />
    </div>
  );
}

function TripList({ title, trips, empty }: { title: string; trips: any[]; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="mt-2 divide-y rounded-xl border bg-white">
        {trips.length === 0 && <p className="p-4 text-sm text-slate-500">{empty}</p>}
        {trips.map((t) => {
          const pending = (t.bookings ?? []).filter((b: any) => b.status === "pending").length;
          return (
            <Link key={t.id} href={`/dashboard/driver/trips/${t.id}`}
              className="flex items-center justify-between gap-3 p-4 text-sm transition hover:bg-slate-50">
              <div className="min-w-0">
                <p className="font-medium">{t.start_city?.name} → {t.end_city?.name}</p>
                <p className="text-slate-500">
                  {formatDate(t.departure_date)} · {formatTime(t.departure_time)} · {t.total_seats - t.available_seats}/{t.total_seats} места · {Number(t.price_per_seat)} ден
                </p>
                {pending > 0 && <p className="mt-0.5 text-xs font-medium text-amber-700">{pending} ново(и) барање(а)</p>}
              </div>
              <StatusBadge status={t.status} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
