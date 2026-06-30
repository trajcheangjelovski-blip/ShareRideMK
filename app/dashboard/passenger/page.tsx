import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PassengerOverview() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, seats_requested, created_at, trips(departure_date, departure_time, start_city_id, end_city_id)")
    .eq("passenger_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const pending = bookings?.filter((b) => b.status === "pending").length ?? 0;
  const approved = bookings?.filter((b) => b.status === "approved").length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Преглед</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Kpi label="Барања во чекање" value={pending} />
        <Kpi label="Одобрени патувања" value={approved} />
        <Kpi label="Вкупно барања" value={bookings?.length ?? 0} />
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
        {(bookings ?? []).map((b) => (
          <div key={b.id} className="flex items-center justify-between p-4 text-sm">
            <span>{b.seats_requested} место(а)</span>
            <StatusBadge status={b.status} />
          </div>
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

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    completed: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${map[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}
