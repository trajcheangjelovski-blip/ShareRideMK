"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const score = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

// Who is reviewed and for which trip comes from the booking, never the form.
// RLS (migration 0006) checks the booking is completed and the user is a party.
export async function submitReview(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bookingId = String(formData.get("booking_id"));
  const type = String(formData.get("review_type"));
  if (type !== "passenger_to_driver" && type !== "driver_to_passenger") return;

  const { data: b } = await supabase
    .from("bookings")
    .select("id, trip_id, passenger_id, trips(driver_id)")
    .eq("id", bookingId)
    .single();
  if (!b) return;
  const driverId = (b as any).trips?.driver_id as string;
  const back = type === "passenger_to_driver"
    ? `/dashboard/passenger/trips/${b.trip_id}`
    : `/dashboard/driver/trips/${b.trip_id}?booking=${b.id}`;

  const rating = score(formData.get("rating"));
  if (!rating) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent("Избери оцена од 1 до 5.")}`);

  const { error } = await supabase.from("reviews").insert({
    trip_id: b.trip_id,
    booking_id: b.id,
    reviewer_id: user.id,
    reviewed_user_id: type === "passenger_to_driver" ? driverId : b.passenger_id,
    review_type: type,
    rating,
    punctuality: score(formData.get("punctuality")),
    driving_safety: score(formData.get("driving_safety")),
    communication: score(formData.get("communication")),
    cleanliness: score(formData.get("cleanliness")),
    behavior: score(formData.get("behavior")),
    comment: String(formData.get("comment") ?? "").trim().slice(0, 500) || null,
  });
  if (error) {
    const msg = error.code === "23505" ? "Веќе остави оцена за ова патување." : "Оценката не е зачувана.";
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(back.split("?")[0]);
}
