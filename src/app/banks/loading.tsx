export default function Loading() {
  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-60 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                <div className="h-2.5 w-28 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                <div className="h-3 w-56 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
