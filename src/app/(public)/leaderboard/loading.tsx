import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1080px] py-10 sm:py-14">
      <header className="flex flex-col gap-3 mb-10">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 sm:h-16 w-80 sm:w-[480px]" />
      </header>
      <div className="flex flex-wrap gap-2 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-5 px-5 py-4 border-b border-border last:border-b-0"
          >
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
