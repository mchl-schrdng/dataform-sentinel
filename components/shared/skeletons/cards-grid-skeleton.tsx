import { Skeleton } from "@/components/ui/skeleton";

export function CardsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="mt-3 h-3 w-60" />
          <Skeleton className="mt-5 h-10 w-full" />
          <Skeleton className="mt-2 h-6 w-full" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
