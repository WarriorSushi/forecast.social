import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="mx-auto w-full max-w-[720px] py-10 sm:py-14">
      <header className="flex items-end justify-between mb-10">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-72" />
        </div>
        <Skeleton className="h-8 w-24" />
      </header>
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-border last:border-b-0 flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
