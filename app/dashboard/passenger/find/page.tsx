import { RideSearch, type RideSearchParams } from "@/components/RideSearch";

export default function FindRidePage({ searchParams }: { searchParams: RideSearchParams }) {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Најди превоз</h1>
      <RideSearch searchParams={searchParams} />
    </div>
  );
}
