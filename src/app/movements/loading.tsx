export default function Loading() {
  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 w-20 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-9 w-64 bg-muted rounded-xl animate-pulse" />
        <div className="h-9 w-20 bg-muted rounded-xl animate-pulse" />
      </div>

      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="h-6 w-16 bg-muted rounded-full animate-pulse" />
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <div className="h-3.5 w-full" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3 border-b border-border last:border-0">
            <div className="space-y-1.5">
              <div className="h-3.5 w-20 bg-muted rounded animate-pulse" />
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="h-3.5 w-16 bg-muted rounded animate-pulse hidden lg:block" />
            <div className="h-3.5 w-20 bg-muted rounded animate-pulse hidden md:block" />
            <div className="h-3.5 w-16 bg-muted rounded animate-pulse hidden lg:block" />
            <div className="h-3.5 w-16 bg-muted rounded animate-pulse hidden sm:block" />
            <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
            <div className="h-5 w-16 bg-muted rounded-full animate-pulse hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
