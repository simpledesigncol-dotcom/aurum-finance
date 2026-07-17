'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const periods = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Ano' },
]

export default function PeriodFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const current = searchParams.get('period') || 'month'

  const setPeriod = (period: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('period', period)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center bg-muted rounded-lg p-[3px]">
      {periods.map((p) => (
        <button
          key={p.id}
          onClick={() => setPeriod(p.id)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150",
            current === p.id
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
