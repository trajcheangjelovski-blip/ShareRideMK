import { createClient } from "@/lib/supabase/server";

export default async function AdminBookingsPage() {
  const supabase = createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, seats_requested, created_at, passenger:passenger_id(first_name,last_name), trips(start_city:start_city_id(name), end_city:end_city_id(name))")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Резервации</h1>
      <div className="mt-6 space-y-2">
        {(bookings ?? []).length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-slate-500">Нема резервации.</p>}
        {(bookings ?? []).map((b: any) => (
          <div key={b.id} className="card-hover flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium">{b.passenger?.first_name} {b.passenger?.last_name}</p>
              <p className="text-slate-500">
                {b.trips?.start_city?.name} → {b.trips?.end_city?.name} · {b.seats_requested} место(а) · {new Date(b.created_at).toLocaleDateString("mk-MK")}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{b.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
