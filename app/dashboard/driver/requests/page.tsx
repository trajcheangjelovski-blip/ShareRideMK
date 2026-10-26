import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { formatDate, fullName } from "@/lib/format";

const PATH = "/dashboard/driver/requests";

async function setStatus(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = String(formData.get("booking_id"));
  const status = String(formData.get("status")); // approved | rejected
  if (status !== "approved" && status !== "rejected") return;
  // Seat decrement + who-may-change-what are enforced by DB triggers.
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) {
    const msg = error.message.includes("Not enough seats")
      ? "Нема доволно слободни места за ова барање."
      : "Барањето не може да се ажурира.";
    redirect(`${PATH}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(PATH);
}

export default async function RequestsPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("bookings")
    .select("id, status, passenger_id, trip_id, seats_requested, message, detour_minutes_estimate, is_within_driver_detour_limit, distance_from_route_km, trips!inner(driver_id, departure_date, start_city:start_city_id(name), end_city:end_city_id(name))")
    .eq("trips.driver_id", user!.id)
    .order("created_at", { ascending: false });
  const requests: any[] = data ?? [];

  const ids = Array.from(new Set(requests.map((r) => r.passenger_id)));
  const { data: profiles } = ids.length
    ? await supabase.from("public_profiles").select("id, first_name, last_initial, profile_image").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const pending = requests.filter((r) => r.status === "pending");
  const others = requests.filter((r) => r.status !== "pending");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Барања од патници</h1>
      {searchParams.error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Во чекање ({pending.length})</h2>
      <div className="mt-2 space-y-3">
        {pending.length === 0 && <p className="text-sm text-slate-500">Нема нови барања.</p>}
        {pending.map((r) => <RequestCard key={r.id} r={r} passenger={byId.get(r.passenger_id)} />)}
      </div>

      {others.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">Претходни</h2>
          <div className="mt-2 space-y-3">
            {others.map((r) => <RequestCard key={r.id} r={r} passenger={byId.get(r.passenger_id)} />)}
          </div>
        </>
      )}
    </div>
  );
}

function RequestCard({ r, passenger }: { r: any; passenger?: any }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <Avatar src={passenger?.profile_image} size={28} />
            {fullName(passenger)}
          </p>
          <Link href={`/dashboard/driver/trips/${r.trip_id}`} className="mt-1 block text-sm text-slate-500 hover:text-brand-dark">
            {r.trips?.start_city?.name} → {r.trips?.end_city?.name} · {formatDate(r.trips?.departure_date)} · {r.seats_requested} место(а)
          </Link>
          {r.detour_minutes_estimate != null && (
            <p className={`text-xs ${r.is_within_driver_detour_limit ? "text-green-600" : "text-red-600"}`}>
              Скршнување ~{Number(r.detour_minutes_estimate)} мин ({Number(r.distance_from_route_km)} км од рута) ·{" "}
              {r.is_within_driver_detour_limit ? "во лимит" : "над лимит"}
            </p>
          )}
          {r.message && <p className="mt-1 text-sm italic text-slate-600">„{r.message}“</p>}
        </div>
        <StatusBadge status={r.status} />
      </div>

      {r.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <form action={setStatus}>
            <input type="hidden" name="booking_id" value={r.id} />
            <input type="hidden" name="status" value="approved" />
            <button className="rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700">Прифати</button>
          </form>
          <form action={setStatus}>
            <input type="hidden" name="booking_id" value={r.id} />
            <input type="hidden" name="status" value="rejected" />
            <button className="rounded-lg border px-4 py-1.5 text-sm hover:bg-slate-50">Одбиј</button>
          </form>
        </div>
      )}
    </div>
  );
}
