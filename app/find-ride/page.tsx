import { SiteHeader } from "@/components/SiteHeader";
import { RideSearch, type RideSearchParams } from "@/components/RideSearch";

export const metadata = { title: "Најди превоз — Macedonia Ride" };

// Public search: visitors can browse rides before registering. Opening a
// trip goes through the dashboard, so login is asked only when booking.
export default function PublicFindRidePage({ searchParams }: { searchParams: RideSearchParams }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Најди превоз</h1>
        <p className="mt-1 text-slate-500">Избери рута и датум. За резервација ќе треба да се најавиш.</p>
        <div className="mt-6">
          <RideSearch searchParams={searchParams} />
        </div>
      </section>
    </main>
  );
}
