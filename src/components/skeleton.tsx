export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse rounded-lg bg-muted ${className}`} style={style} />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-8 w-36 bg-muted rounded-lg animate-pulse" />
      </div>

      <div className="h-32 bg-muted rounded-xl animate-pulse" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-6 w-28 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border border-border p-5 space-y-4">
          <div className="h-4 w-36 bg-muted rounded animate-pulse" />
          <div className="h-52 bg-muted/50 rounded-lg animate-pulse" />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border p-5 space-y-4">
          <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between"><div className="h-4 w-20 bg-muted rounded animate-pulse" /><div className="h-4 w-24 bg-muted rounded animate-pulse" /></div>
          ))}
        </div>
      </div>
    </div>
  )
}
