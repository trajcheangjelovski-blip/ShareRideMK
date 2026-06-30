import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function unpublish(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("users").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") return;
  const admin = createAdminClient();
  await admin.from("trips").update({ status: "cancelled" }).eq("id", String(formData.get("trip_id")));
  revalidatePath("/admin/trips");
}

export default async function AdminTripsPage() {
  const supabase = createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("id, status, departure_date, departure_time, price_per_seat, available_seats, start_city:start_city_id(name), end_city:end_city_id(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Патувања</h1>
      <div className="mt-6 space-y-2">
        {(trips ?? []).length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-slate-500">Нема патувања.</p>}
        {(trips ?? []).map((t: any) => (
          <div key={t.id} className="card-hover flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium">{t.start_city?.name} → {t.end_city?.name}</p>
              <p className="text-slate-500">{t.departure_date} · {t.departure_time?.slice(0,5)} · {t.price_per_seat} ден · {t.available_seats} места</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{t.status}</span>
              {t.status !== "cancelled" && t.status !== "completed" && (
                <form action={unpublish}>
                  <input type="hidden" name="trip_id" value={t.id} />
                  <button className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Откажи</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
