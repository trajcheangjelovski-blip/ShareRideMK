import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "../page";

export default async function MyTripsPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, seats_requested, detour_minutes_estimate, is_within_driver_detour_limit, " +
        "trips(departure_date, departure_time, start_city:start_city_id(name), end_city:end_city_id(name))"
    )
    .eq("passenger_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
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
          <p className="p-4 text-sm text-slate-500">Сè уште немаш патувања.</p>
        )}
        {(bookings ?? []).map((b: any) => (
          <div key={b.id} className="flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium">
                {b.trips?.start_city?.name} → {b.trips?.end_city?.name}
              </p>
              <p className="text-slate-500">
                {b.trips?.departure_date} · {b.trips?.departure_time?.slice(0, 5)} · {b.seats_requested} место(а)
              </p>
              {b.detour_minutes_estimate != null && (
                <p className={`text-xs ${b.is_within_driver_detour_limit ? "text-green-600" : "text-red-600"}`}>
                  Скршнување ~{b.detour_minutes_estimate} мин ·{" "}
                  {b.is_within_driver_detour_limit ? "во лимит" : "над лимит"}
                </p>
              )}
            </div>
            <StatusBadge status={b.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
