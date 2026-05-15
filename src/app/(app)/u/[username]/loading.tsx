import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl py-2">
      <section className="flex items-start gap-5 sm:gap-7">
        <Skeleton className="size-20 sm:size-24 rounded-md" />
        <div className="flex-1 flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </section>
      <section className="mt-10 sm:mt-12 border-t border-border pt-8">
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-20 w-56 mb-4" />
        <div className="flex gap-3">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </section>
      <section className="mt-10 sm:mt-12 border-t border-border pt-8">
        <Skeleton className="h-3 w-24 mb-5" />
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-border last:border-b-0 flex items-center gap-4">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
