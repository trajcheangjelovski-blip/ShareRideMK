import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function count(table: string, filters?: (q: any) => any) {
  const supabase = createClient();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filters) q = filters(q);
  const { count } = await q;
  return count ?? 0;
}

export default async function AdminOverview() {
  const [users, pendingUsers, drivers, trips, activeTrips, pendingBookings, openReports] =
    await Promise.all([
      count("users"),
      count("users", (q) => q.eq("status", "pending")),
      count("users", (q) => q.eq("is_driver", true)),
      count("trips"),
      count("trips", (q) => q.in("status", ["published", "in_progress", "driver_on_the_way"])),
      count("bookings", (q) => q.eq("status", "pending")),
      count("reports", (q) => q.eq("status", "open")),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Админ преглед</h1>

      {pendingUsers > 0 && (
        <Link
          href="/admin/users?filter=pending"
          className="reveal mt-4 flex items-center justify-between rounded-2xl border border-promo/30 bg-promo/10 p-4 text-sm transition hover:shadow-lift"
        >
          <span className="font-medium text-amber-800">
            {pendingUsers} {pendingUsers === 1 ? "нов профил чека" : "нови профили чекаат"} одобрување
          </span>
          <span className="rounded-lg bg-promo px-3 py-1.5 font-medium text-white">Прегледај →</span>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Корисници" value={users} />
        <Kpi label="На чекање" value={pendingUsers} accent />
        <Kpi label="Возачи" value={drivers} />
        <Kpi label="Патувања" value={trips} />
        <Kpi label="Активни патувања" value={activeTrips} />
        <Kpi label="Резервации во чекање" value={pendingBookings} />
        <Kpi label="Отворени пријави" value={openReports} />
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="reveal card-hover p-5">
      <p className={`text-3xl font-extrabold ${accent && value > 0 ? "text-promo" : "text-gradient"}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
