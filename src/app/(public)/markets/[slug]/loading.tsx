import { Skeleton } from "@/components/ui/skeleton";

export default function MarketDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-[960px] py-10 sm:py-14">
      <Skeleton className="h-4 w-28 mb-8" />
      <Skeleton className="h-6 w-32 mb-6" />
      <Skeleton className="h-16 sm:h-24 w-full mb-3" />
      <Skeleton className="h-16 sm:h-24 w-3/4 mb-10" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 flex flex-col gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="lg:col-span-5">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
