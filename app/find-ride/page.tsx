import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { RideSearch, type RideSearchParams } from "@/components/RideSearch";

export const metadata = { title: "Најди превоз — Macedonia Ride" };

// Public search: visitors can browse rides before registering. Opening a
// trip goes through the dashboard, so login is asked only when booking.
export default function PublicFindRidePage({ searchParams }: { searchParams: RideSearchParams }) {
  return (
    <main className="relative isolate min-h-screen bg-canvas">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-[#e6f5f2] to-canvas" />
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-4 pb-20 pt-10">
        <p className="eyebrow">Пребарување</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Најди превоз</h1>
        <p className="mt-2 text-slate-600">Избери рута и датум. За резервација ќе треба да се најавиш.</p>
        <div className="mt-6">
          <RideSearch searchParams={searchParams} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
