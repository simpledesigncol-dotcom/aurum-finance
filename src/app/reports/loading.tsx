import { Skeleton } from '@/components/skeleton'

export default function ReportsLoading() {
  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-end gap-1 h-48">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 space-y-1">
                <Skeleton className="w-full rounded-[3px]" style={{ height: `${30 + Math.random() * 70}%` }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-52" />
          </div>
          <div className="overflow-hidden">
            <div className="flex gap-3 py-2 border-b border-border">
              {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                <Skeleton key={j} className="h-3 flex-1" />
              ))}
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 py-2.5 border-b border-border/50">
                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                  <Skeleton key={j} className="h-3 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-14 rounded-lg" />
                ))}
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="w-2 h-2 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-1.5 flex-1 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
