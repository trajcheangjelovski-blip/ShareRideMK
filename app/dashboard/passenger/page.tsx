import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatTime } from "@/lib/format";

export default async function PassengerOverview() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const count = (status?: string) => {
    let q = supabase.from("bookings").select("id", { count: "exact", head: true }).eq("passenger_id", user!.id);
    if (status) q = q.eq("status", status);
    return q;
  };

  const [{ count: pending }, { count: approved }, { count: total }, { data: bookings }] = await Promise.all([
    count("pending"),
    count("approved"),
    count(),
    supabase
      .from("bookings")
      .select("id, status, seats_requested, trip_id, trips(departure_date, departure_time, start_city:start_city_id(name), end_city:end_city_id(name))")
      .eq("passenger_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Преглед</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Kpi label="Барања во чекање" value={pending ?? 0} />
        <Kpi label="Одобрени патувања" value={approved ?? 0} />
        <Kpi label="Вкупно барања" value={total ?? 0} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium">Последни барања</h2>
        <Link href="/dashboard/passenger/find" className="btn-primary !px-4 !py-2 text-sm">
          Најди превоз
        </Link>
      </div>

      <div className="mt-4 divide-y rounded-xl border">
        {(bookings ?? []).length === 0 && (
          <p className="p-4 text-sm text-slate-500">Сè уште немаш барања.</p>
        )}
        {(bookings ?? []).map((b: any) => (
          <Link
            key={b.id}
            href={`/dashboard/passenger/trips/${b.trip_id}`}
            className="flex items-center justify-between gap-3 p-4 text-sm transition hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="font-medium">{b.trips?.start_city?.name} → {b.trips?.end_city?.name}</p>
              <p className="text-slate-500">
                {formatDate(b.trips?.departure_date)} · {formatTime(b.trips?.departure_time)} · {b.seats_requested} место(а)
              </p>
            </div>
            <StatusBadge status={b.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="reveal card-hover p-5">
      <p className="text-3xl font-extrabold text-gradient">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
