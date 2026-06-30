import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function setStatus(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = String(formData.get("booking_id"));
  const status = String(formData.get("status")); // approved | rejected
  // The seat decrement is handled by the DB trigger on_booking_status_change.
  await supabase.from("bookings").update({ status }).eq("id", id);
  revalidatePath("/dashboard/driver/requests");
}

export default async function RequestsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: requests } = await supabase
    .from("bookings")
    .select(
      "id, status, seats_requested, message, detour_minutes_estimate, " +
        "is_within_driver_detour_limit, distance_from_route_km, " +
        "passenger:passenger_id(first_name,last_name), " +
        "trips!inner(driver_id, start_city:start_city_id(name), end_city:end_city_id(name), departure_date)"
    )
    .eq("trips.driver_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Барања од патници</h1>

      <div className="mt-6 space-y-3">
        {(requests ?? []).length === 0 && (
          <p className="text-sm text-slate-500">Нема барања.</p>
        )}
        {(requests ?? []).map((r: any) => (
          <div key={r.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {r.passenger?.first_name} {r.passenger?.last_name}
                </p>
                <p className="text-sm text-slate-500">
                  {r.trips?.start_city?.name} → {r.trips?.end_city?.name} · {r.trips?.departure_date} · {r.seats_requested} место(а)
                </p>
                {r.detour_minutes_estimate != null && (
                  <p className={`text-xs ${r.is_within_driver_detour_limit ? "text-green-600" : "text-red-600"}`}>
                    Скршнување ~{r.detour_minutes_estimate} мин ({r.distance_from_route_km} км од рута) ·{" "}
                    {r.is_within_driver_detour_limit ? "во лимит" : "над лимит"}
                  </p>
                )}
                {r.message && <p className="mt-1 text-sm italic text-slate-600">„{r.message}“</p>}
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span>
            </div>

            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <form action={setStatus}>
                  <input type="hidden" name="booking_id" value={r.id} />
                  <input type="hidden" name="status" value="approved" />
                  <button className="rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700">
                    Прифати
                  </button>
                </form>
                <form action={setStatus}>
                  <input type="hidden" name="booking_id" value={r.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="rounded-lg border px-4 py-1.5 text-sm hover:bg-slate-50">
                    Одбиј
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
