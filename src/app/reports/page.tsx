'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Download, Receipt, FileSpreadsheet, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import * as XLSX from 'xlsx'

interface Movement {
  id: string
  movementType: string
  amount: number
  direction: string
  movementDate: string
  description: string | null
  category: { id: string; name: string } | null
  contact: { id: string; name: string } | null
}

const periods = [
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Año' },
]

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function BarChart({ data }: { data: { label: string; income: number; expenses: number }[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expenses)), 1)
  return (
          <div className="flex items-end gap-1 h-48 px-1 overflow-x-auto">
      {data.map((d, i) => {
        const incomeH = (d.income / maxVal) * 100
        const expenseH = (d.expenses / maxVal) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2.5 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              <div className="font-medium mb-0.5">{d.label}</div>
              <div className="text-success font-medium">+{formatCurrency(d.income)}</div>
              <div className="text-danger font-medium">-{formatCurrency(d.expenses)}</div>
            </div>
            <div className="w-full flex gap-[3px] items-end" style={{ height: '100%' }}>
              <div className="flex-1 rounded-[3px] bg-success/60 hover:bg-success transition-colors duration-150" style={{ height: `${Math.max(incomeH, 1)}%` }} />
              <div className="flex-1 rounded-[3px] bg-danger/40 hover:bg-danger/60 transition-colors duration-150" style={{ height: `${Math.max(expenseH, 1)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function ReportsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [activeChart, setActiveChart] = useState<'cashflow' | 'categories' | 'trend'>('cashflow')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchMovements = useCallback(async () => {
    try {
      const res = await fetch('/api/movements?limit=500')
      const data = await res.json()
      setMovements(Array.isArray(data.movements) ? data.movements : [])
    } catch {
      console.error('Error fetching movements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  const now = new Date()
  const getStartOfPeriod = () => {
    switch (period) {
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      case 'year':
        return new Date(now.getFullYear(), 0, 1)
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1)
    }
  }

  const startOfPeriod = getStartOfPeriod()
  const periodMovements = movements.filter(m => {
    const d = new Date(m.movementDate)
    return d >= startOfPeriod
  })

  const totalIncome = periodMovements.filter(m => m.direction === 'in').reduce((s, m) => s + m.amount, 0)
  const totalExpenses = periodMovements.filter(m => m.direction === 'out').reduce((s, m) => s + m.amount, 0)
  const netFlow = totalIncome - totalExpenses
  const incomeCount = periodMovements.filter(m => m.direction === 'in').length
  const expenseCount = periodMovements.filter(m => m.direction === 'out').length

  const categoryMap = new Map<string, { name: string; total: number; count: number }>()
  periodMovements.filter(m => m.direction === 'out').forEach(m => {
    const key = m.category?.name || 'Sin categoría'
    const existing = categoryMap.get(key) || { name: key, total: 0, count: 0 }
    existing.total += m.amount
    existing.count++
    categoryMap.set(key, existing)
  })
  const topCategories = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total).slice(0, 8)

  const barData: { label: string; income: number; expenses: number }[] = []
  if (period === 'year') {
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), i, 1)
      const mEnd = new Date(now.getFullYear(), i + 1, 1)
      const mm = movements.filter(mt => {
        const d = new Date(mt.movementDate)
        return d >= m && d < mEnd
      })
      barData.push({
        label: monthNames[m.getMonth()],
        income: mm.filter(mt => mt.direction === 'in').reduce((s, mt) => s + mt.amount, 0),
        expenses: mm.filter(mt => mt.direction === 'out').reduce((s, mt) => s + mt.amount, 0),
      })
    }
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3)
    for (let i = 0; i < 3; i++) {
      const m = new Date(now.getFullYear(), quarter * 3 + i, 1)
      const mEnd = new Date(now.getFullYear(), quarter * 3 + i + 1, 1)
      const mm = movements.filter(mt => {
        const d = new Date(mt.movementDate)
        return d >= m && d < mEnd
      })
      barData.push({
        label: monthNames[m.getMonth()],
        income: mm.filter(mt => mt.direction === 'in').reduce((s, mt) => s + mt.amount, 0),
        expenses: mm.filter(mt => mt.direction === 'out').reduce((s, mt) => s + mt.amount, 0),
      })
    }
  } else {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const weekStart = new Date(monthStart)
    let weekNum = 1
    while (weekStart < monthEnd) {
      const wEnd = new Date(weekStart); wEnd.setDate(weekStart.getDate() + 7)
      const wm = movements.filter(m => {
        const d = new Date(m.movementDate)
        return d >= weekStart && d < (wEnd < monthEnd ? wEnd : monthEnd)
      })
      barData.push({
        label: `S${weekNum}`,
        income: wm.filter(m => m.direction === 'in').reduce((s, m) => s + m.amount, 0),
        expenses: wm.filter(m => m.direction === 'out').reduce((s, m) => s + m.amount, 0),
      })
      weekStart.setDate(weekStart.getDate() + 7)
      weekNum++
    }
  }

  const expensePercent = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const avgExpensePerTransaction = expenseCount > 0 ? totalExpenses / expenseCount : 0
  const avgIncomePerTransaction = incomeCount > 0 ? totalIncome / incomeCount : 0

  const periodLabel = periods.find(p => p.id === period)?.label || ''

  const exportExcel = () => {
    const summaryData = [
      ['Aurum Finance - Reporte ' + periodLabel],
      [],
      ['Indicador', 'Valor'],
      ['Ingresos', totalIncome],
      ['Gastos', totalExpenses],
      ['Flujo neto', netFlow],
      ['Transacciones ingresos', incomeCount],
      ['Transacciones gastos', expenseCount],
      ['Promedio ingreso', avgIncomePerTransaction],
      ['Promedio gasto', avgExpensePerTransaction],
      ['% Gasto/Ingreso', expensePercent.toFixed(1) + '%'],
    ]

    const movementsData = [
      ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Contacto', 'Dirección', 'Monto'],
      ...periodMovements.map(m => [
        formatDate(m.movementDate),
        m.movementType,
        m.description || '',
        m.category?.name || '',
        m.contact?.name || '',
        m.direction === 'in' ? 'Ingreso' : 'Egreso',
        m.direction === 'in' ? m.amount : -m.amount,
      ]),
    ]

    const categoriesData = [
      ['Categoría', 'Total', 'Transacciones'],
      ...Array.from(categoryMap.values()).sort((a, b) => b.total - a.total).map(c => [c.name, c.total, c.count]),
    ]

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    const ws2 = XLSX.utils.aoa_to_sheet(movementsData)
    const ws3 = XLSX.utils.aoa_to_sheet(categoriesData)

    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }]
    ws2['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 16 }]
    ws3['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }]

    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')
    XLSX.utils.book_append_sheet(wb, ws2, 'Movimientos')
    XLSX.utils.book_append_sheet(wb, ws3, 'Categorías')
    XLSX.writeFile(wb, `Reporte_${periodLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setExportOpen(false)
  }

  const exportPdf = () => {
    setExportOpen(false)
    window.print()
  }

  if (loading) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-28 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-header { text-align: center; padding: 20px 0; border-bottom: 2px solid #2563eb; margin-bottom: 24px; }
          .print-header h1 { font-size: 22px; font-weight: 700; color: #111; margin: 0; }
          .print-header p { font-size: 13px; color: #666; margin: 4px 0 0; }
          .print-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .print-summary-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
          .print-summary-item .label { font-size: 10px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; }
          .print-summary-item .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
          .print-summary-item .sub { font-size: 10px; color: #9ca3af; margin-top: 2px; }
          .print-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
          .print-table th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-weight: 600; border: 1px solid #e5e7eb; }
          .print-table td { padding: 6px 10px; border: 1px solid #e5e7eb; }
          .print-table tr:nth-child(even) { background: #f9fafb; }
          .print-footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
          @page { margin: 20mm 15mm; }
          .print-section-title { font-size: 14px; font-weight: 600; margin: 16px 0 8px; }
        }
        .print-only { display: none; }
      `}</style>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Análisis y reportes financieros</p>
        </div>
          <div className="flex items-center gap-2 relative" ref={exportRef}>
            <div className="flex items-center bg-muted rounded-lg p-[3px]">
              {periods.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                    period === p.id
                      ? 'bg-card text-foreground shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => setExportOpen(!exportOpen)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors">
              <Download size={13} />
              Exportar
            </button>
            {exportOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <button onClick={exportExcel} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-muted transition-colors text-left">
                  <FileSpreadsheet size={15} className="text-success" />
                  <div>
                    <p className="text-sm">Excel</p>
                    <p className="text-[10px] text-muted-foreground">Reporte completo en .xlsx</p>
                  </div>
                </button>
                <div className="h-px bg-border" />
                <button onClick={exportPdf} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-muted transition-colors text-left">
                  <FileText size={15} className="text-danger" />
                  <div>
                    <p className="text-sm">PDF</p>
                    <p className="text-[10px] text-muted-foreground">Versión para imprimir/enviar</p>
                  </div>
                </button>
              </div>
            )}
          </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ingresos</span>
            <div className="w-7 h-7 rounded-lg bg-success/[0.08] flex items-center justify-center">
              <ArrowDownLeft size={14} className="text-success" />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight text-success">{formatCurrency(totalIncome)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{incomeCount} transacciones</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gastos</span>
            <div className="w-7 h-7 rounded-lg bg-danger/[0.08] flex items-center justify-center">
              <ArrowUpRight size={14} className="text-danger" />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight text-danger">{formatCurrency(totalExpenses)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{expenseCount} transacciones</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Flujo neto</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${netFlow >= 0 ? 'bg-success/[0.08]' : 'bg-danger/[0.08]'}`}>
              {netFlow >= 0 ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
            </div>
          </div>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${netFlow >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(netFlow)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{expensePercent.toFixed(1)}% gasto/ingreso</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Promedio gasto</span>
            <div className="w-7 h-7 rounded-lg bg-warning/[0.08] flex items-center justify-center">
              <Receipt size={14} className="text-warning" />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(avgExpensePerTransaction)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Promedio ingreso: {formatCurrency(avgIncomePerTransaction)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card rounded-xl border border-border p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm">Ingresos vs Gastos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {period === 'month' ? 'Últimas 12 semanas' : period === 'quarter' ? 'Meses del trimestre' : 'Meses del año'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success/60" />Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger/40" />Gastos</span>
            </div>
          </div>
          {barData.length > 0 ? (
            <BarChart data={barData} />
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Sin datos para este periodo</div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 animate-slide-up">
            <h3 className="font-semibold text-sm mb-4">Resumen del periodo</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Ingresos</span>
                <span className="text-sm font-semibold tabular-nums text-success">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Gastos</span>
                <span className="text-sm font-semibold tabular-nums text-danger">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">Neto</span>
                <span className={`text-sm font-bold tabular-nums ${netFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(netFlow)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 animate-slide-up">
            <h3 className="font-semibold text-sm mb-4">Top categorías de gasto</h3>
            {topCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin datos de gastos</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map((cat, i) => {
                  const maxCatTotal = topCategories[0]?.total || 1
                  const barWidth = (cat.total / maxCatTotal) * 100
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate max-w-[140px]">{cat.name}</span>
                        <span className="text-xs tabular-nums font-medium text-danger">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-danger/40 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border animate-slide-up">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Últimos movimientos</h2>
          <span className="text-xs text-muted-foreground">{periodMovements.length} registros</span>
        </div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {periodMovements.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Receipt size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin movimientos en este periodo</p>
            </div>
          ) : (
            periodMovements.slice(0, 30).map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.direction === 'in' ? 'bg-success/[0.08] text-success' : 'bg-danger/[0.08] text-danger'}`}>
                  {m.direction === 'in' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.description || m.movementType}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.category?.name || 'Sin categoría'}
                    {m.contact && ` · ${m.contact.name}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${m.direction === 'in' ? 'text-success' : 'text-danger'}`}>
                    {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.movementDate)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Print-only report */}
      <div className="print-only">
        <div className="print-header">
          <h1>Aurum Finance — Reporte {periodLabel}</h1>
          <p>Generado el {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="print-summary">
          <div className="print-summary-item">
            <div className="label">Ingresos</div>
            <div className="value" style={{ color: '#16a34a' }}>{formatCurrency(totalIncome)}</div>
            <div className="sub">{incomeCount} transacciones</div>
          </div>
          <div className="print-summary-item">
            <div className="label">Gastos</div>
            <div className="value" style={{ color: '#dc2626' }}>{formatCurrency(totalExpenses)}</div>
            <div className="sub">{expenseCount} transacciones</div>
          </div>
          <div className="print-summary-item">
            <div className="label">Flujo neto</div>
            <div className="value" style={{ color: netFlow >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(netFlow)}</div>
            <div className="sub">{expensePercent.toFixed(1)}% gasto/ingreso</div>
          </div>
          <div className="print-summary-item">
            <div className="label">Promedio gasto</div>
            <div className="value">{formatCurrency(avgExpensePerTransaction)}</div>
            <div className="sub">Por transacción</div>
          </div>
        </div>

        <div className="print-section-title">Movimientos del período</div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Contacto</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {periodMovements.slice(0, 50).map(m => (
              <tr key={m.id}>
                <td>{formatDate(m.movementDate)}</td>
                <td>{m.description || m.movementType}</td>
                <td>{m.category?.name || '-'}</td>
                <td>{m.contact?.name || '-'}</td>
                <td>{m.direction === 'in' ? 'Ingreso' : 'Egreso'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{m.direction === 'in' ? '' : '-'}{formatCurrency(m.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-footer">Aurum Finance — Reporte generado automáticamente</div>
      </div>
    </div>
  )
}
