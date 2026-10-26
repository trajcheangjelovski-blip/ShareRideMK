import { createClient } from "@/lib/supabase/server";
import { formatDateTime, fullName } from "@/lib/format";

// Latest reviews a user received, with average. Reviews are public (RLS).
export async function ReviewList({
  userId,
  type,
  limit = 5,
  title = "Оценки",
}: {
  userId: string;
  type: "passenger_to_driver" | "driver_to_passenger";
  limit?: number;
  title?: string;
}) {
  const supabase = createClient();
  const { data, count } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id", { count: "exact" })
    .eq("reviewed_user_id", userId)
    .eq("review_type", type)
    .order("created_at", { ascending: false })
    .limit(limit);
  const reviews: any[] = data ?? [];

  const { data: avgRows } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewed_user_id", userId)
    .eq("review_type", type);
  const avg = avgRows?.length ? avgRows.reduce((s, r) => s + r.rating, 0) / avgRows.length : 0;

  const ids = Array.from(new Set(reviews.map((r) => r.reviewer_id)));
  const { data: people } = ids.length
    ? await supabase.from("public_profiles").select("id, first_name, last_initial").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p: any) => [p.id, p]));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{title}</h3>
        {count ? (
          <p className="text-sm text-slate-500">
            <span className="font-bold text-amber-500">★ {avg.toFixed(1)}</span> · {count} {count === 1 ? "оценка" : "оценки"}
          </p>
        ) : null}
      </div>
      {reviews.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Сè уште нема оценки.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-500">{"★".repeat(r.rating)}<span className="text-slate-300">{"★".repeat(5 - r.rating)}</span></span>
                <span className="text-xs text-slate-400">{fullName(byId.get(r.reviewer_id))} · {formatDateTime(r.created_at)}</span>
              </div>
              {r.comment && <p className="mt-1 text-slate-700">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
