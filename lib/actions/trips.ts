"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const tripPath = (id: string) => `/dashboard/driver/trips/${id}`;
const fail = (tripId: string, msg: string): never =>
  redirect(`${tripPath(tripId)}?error=${encodeURIComponent(msg)}`);

// Driver: start / complete / cancel a trip. Cascades to bookings and
// notifications happen in DB triggers (migration 0007), which also reject
// invalid transitions.
export async function setTripStatus(formData: FormData) {
  const supabase = createClient();
  const tripId = String(formData.get("trip_id"));
  const status = String(formData.get("status"));
  if (!["in_progress", "completed", "cancelled"].includes(status)) return;

  const { error } = await supabase.from("trips").update({ status }).eq("id", tripId);
  if (error) fail(tripId, "Статусот на патувањето не може да се смени.");
  revalidatePath(tripPath(tripId));
  revalidatePath("/dashboard/driver/trips");
}

// Driver: decide on a passenger's booking from the trip page.
export async function setBookingStatus(formData: FormData) {
  const supabase = createClient();
  const tripId = String(formData.get("trip_id"));
  const bookingId = String(formData.get("booking_id"));
  const status = String(formData.get("status"));
  if (!["approved", "rejected", "no_show"].includes(status)) return;

  const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
  if (error) {
    fail(tripId, error.message.includes("Not enough seats")
      ? "Нема доволно слободни места за ова барање."
      : "Барањето не може да се ажурира.");
  }
  revalidatePath(tripPath(tripId));
}
