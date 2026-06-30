import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DriverOverview() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trips } = await supabase
    .from("trips")
    .select("id, status, departure_date, available_seats")
    .eq("driver_id", user!.id);

  const { data: pendingReqs } = await supabase
    .from("bookings")
    .select("id, trips!inner(driver_id)")
    .eq("trips.driver_id", user!.id)
    .eq("status", "pending");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Возач — Преглед</h1>
        <Link href="/dashboard/driver/create-trip" className="btn-primary !px-4 !py-2 text-sm">
          Креирај патување
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Kpi label="Мои патувања" value={trips?.length ?? 0} />
        <Kpi label="Барања во чекање" value={pendingReqs?.length ?? 0} />
        <Kpi label="Објавени" value={trips?.filter((t) => t.status === "published").length ?? 0} />
      </div>

      <div className="mt-8">
        <Link href="/dashboard/driver/requests" className="text-sm text-brand hover:underline">
          Види ги барањата →
        </Link>
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
