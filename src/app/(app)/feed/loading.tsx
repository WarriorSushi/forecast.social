import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div className="mx-auto w-full max-w-[960px] py-10 sm:py-14 flex flex-col gap-14">
      <header className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 sm:h-16 w-64 sm:w-80" />
      </header>

      {Array.from({ length: 3 }).map((_, section) => (
        <section key={section} className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-md" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
