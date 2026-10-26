import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatTime } from "@/lib/format";

export default async function MyTripsPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, seats_requested, trip_id, detour_minutes_estimate, is_within_driver_detour_limit, trips(departure_date, departure_time, status, start_city:start_city_id(name), end_city:end_city_id(name))")
    .eq("passenger_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Мои патувања</h1>
      {searchParams.sent && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Барањето е испратено. Чекаш одобрување од возачот.
        </p>
      )}
      {searchParams.error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>
      )}

      <div className="mt-6 divide-y rounded-xl border">
        {(bookings ?? []).length === 0 && (
          <p className="p-4 text-sm text-slate-500">
            Сè уште немаш патувања.{" "}
            <Link href="/dashboard/passenger/find" className="font-medium text-brand-dark hover:underline">Најди превоз →</Link>
          </p>
        )}
        {(bookings ?? []).map((b: any) => (
          <Link
            key={b.id}
            href={`/dashboard/passenger/trips/${b.trip_id}`}
            className="flex items-center justify-between gap-3 p-4 text-sm transition hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {b.trips?.start_city?.name} → {b.trips?.end_city?.name}
              </p>
              <p className="text-slate-500">
                {formatDate(b.trips?.departure_date)} · {formatTime(b.trips?.departure_time)} · {b.seats_requested} место(а)
              </p>
              {b.status === "approved" && b.trips?.status === "in_progress" && (
                <p className="mt-0.5 text-xs font-medium text-cyan-700">● Во тек — следи го возилото во живо</p>
              )}
            </div>
            <StatusBadge status={b.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
