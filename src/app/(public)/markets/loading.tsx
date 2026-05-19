import { Skeleton } from "@/components/ui/skeleton";

export default function MarketsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] py-10 sm:py-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-10">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-12 sm:h-16 w-72 sm:w-96" />
        </div>
        <Skeleton className="h-4 w-40" />
      </header>

      <div className="flex flex-wrap gap-2 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[260px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
