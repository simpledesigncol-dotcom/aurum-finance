export default function Loading() {
  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-40 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Position card skeleton */}
      <div className="bg-card rounded-xl border border-border p-6 sm:p-8 space-y-4">
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        <div className="h-10 w-56 bg-muted rounded-lg animate-pulse" />
        <div className="flex items-center gap-6 mt-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-3 w-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Flow chart skeleton */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-3 w-14 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-end gap-2 h-48 px-1">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-[3px] items-end" style={{ height: '100%' }}>
                <div className="flex-1 bg-muted/60 rounded-[3px] animate-pulse" style={{ height: `${30 + Math.random() * 60}%` }} />
                <div className="flex-1 bg-muted/40 rounded-[3px] animate-pulse" style={{ height: `${20 + Math.random() * 50}%` }} />
              </div>
              <div className="h-2.5 w-6 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Where is the money skeleton */}
      <div>
        <div className="h-3 w-40 bg-muted rounded animate-pulse mb-3 px-1" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="w-9 h-9 bg-muted rounded-xl" />
              </div>
              <div className="h-6 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Attention skeleton */}
      <div>
        <div className="h-3 w-32 bg-muted rounded animate-pulse mb-3 px-1" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-muted rounded-xl" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-48 bg-muted rounded" />
                </div>
              </div>
              <div className="w-3.5 h-3.5 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity timeline skeleton */}
      <div>
        <div className="h-3 w-36 bg-muted rounded animate-pulse mb-3 px-1" />
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  {i < 5 && <div className="w-px flex-1 bg-border min-h-[20px]" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-36 bg-muted rounded" />
                    <div className="h-3.5 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-2.5 w-20 bg-muted rounded mt-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
