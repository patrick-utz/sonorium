import { cn } from "@/lib/utils";

interface RecordCardSkeletonProps {
  className?: string;
}

export function RecordCardSkeleton({ className }: RecordCardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-card shadow-card",
        "border border-border/30",
        "max-w-xs animate-pulse",
        className
      )}
    >
      {/* Cover Image Skeleton */}
      <div className="aspect-square bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 relative overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>

      {/* Card Footer Skeleton */}
      <div className="p-4 space-y-3">
        {/* Mood indicators */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-600" />
          <div className="w-2 h-2 rounded-full bg-gray-600" />
          <div className="w-2 h-2 rounded-full bg-gray-600" />
        </div>

        {/* Album title */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-700 rounded w-1/2" />
        </div>

        {/* Year and label */}
        <div className="h-2 bg-gray-700 rounded w-2/3" />

        {/* Rating and recommendation */}
        <div className="flex justify-between">
          <div className="h-3 bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-700 rounded w-1/4" />
        </div>

        {/* Streaming links */}
        <div className="flex gap-2 pt-2">
          <div className="h-6 bg-gray-700 rounded-full flex-1" />
          <div className="h-6 bg-gray-700 rounded-full flex-1" />
        </div>
      </div>
    </div>
  );
}

interface RecordGridSkeletonProps {
  count?: number;
  className?: string;
}

export function RecordGridSkeleton({ count = 12, className }: RecordGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7",
        className
      )}
    >
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <RecordCardSkeleton key={i} />
        ))}
    </div>
  );
}
