import { redirect } from "next/navigation";

// Landing-page entry point for drivers. Middleware sends visitors who are not
// logged in to /login, which returns them here afterwards.
export default function OfferRidePage() {
  redirect("/dashboard/driver/create-trip");
}
