export default function Loading() {
  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-44 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-muted rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="h-6 w-28 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="h-9 w-64 bg-muted rounded-xl animate-pulse" />
        <div className="h-8 w-56 bg-muted rounded-lg animate-pulse" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['#OT', 'Cliente', 'Vehículo', 'Estado', 'Ingresos', 'Costos', 'Utilidad', 'Margen', ''].map((h, i) => (
                  <th key={i} className={`text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 ${i > 2 ? 'hidden' : ''} ${i === 0 ? 'md:table-cell' : ''} ${i === 2 ? 'lg:table-cell' : ''} ${i > 4 ? 'sm:table-cell' : ''} ${i > 5 ? 'lg:table-cell' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><div className="h-3.5 w-16 bg-muted rounded animate-pulse" /></td>
                  <td className="px-5 py-3"><div className="h-3.5 w-28 bg-muted rounded animate-pulse" /></td>
                  <td className="px-5 py-3 hidden md:table-cell"><div className="h-3.5 w-24 bg-muted rounded animate-pulse" /></td>
                  <td className="px-5 py-3"><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /></td>
                  <td className="px-5 py-3 hidden sm:table-cell"><div className="h-3.5 w-20 bg-muted rounded animate-pulse" /></td>
                  <td className="px-5 py-3 hidden sm:table-cell"><div className="h-3.5 w-20 bg-muted rounded animate-pulse" /></td>
                  <td className="px-5 py-3 hidden lg:table-cell"><div className="h-3.5 w-20 bg-muted rounded animate-pulse" /></td>
                  <td className="px-5 py-3 hidden lg:table-cell"><div className="h-3.5 w-10 bg-muted rounded animate-pulse" /></td>
                  <td className="px-5 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
