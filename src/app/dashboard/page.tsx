export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getTotalCashBalance, getTotalBankBalance } from '@/lib/balances'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  AlertTriangle, CreditCard, Receipt
} from 'lucide-react'
import Link from 'next/link'
import PeriodFilter from '@/components/period-filter'
import { Suspense } from 'react'

async function getDashboardData(period: string = 'month') {
  const companyId = 'default'
  const now = new Date()

  let startOfPeriod: Date
  let startOfPrevPeriod: Date

  switch (period) {
    case 'week':
      startOfPeriod = new Date(now)
      startOfPeriod.setDate(now.getDate() - now.getDay())
      startOfPeriod.setHours(0, 0, 0, 0)
      startOfPrevPeriod = new Date(startOfPeriod)
      startOfPrevPeriod.setDate(startOfPrevPeriod.getDate() - 7)
      break
    case 'quarter':
      startOfPeriod = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      startOfPrevPeriod = new Date(startOfPeriod)
      startOfPrevPeriod.setMonth(startOfPrevPeriod.getMonth() - 3)
      break
    case 'year':
      startOfPeriod = new Date(now.getFullYear(), 0, 1)
      startOfPrevPeriod = new Date(now.getFullYear() - 1, 0, 1)
      break
    default:
      startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1)
      startOfPrevPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  }

  const [totalCash, totalBank] = await Promise.all([
    getTotalCashBalance(companyId),
    getTotalBankBalance(companyId),
  ])

  const [currentMovements, prevMovements, allMovements] = await Promise.all([
    prisma.financialMovement.findMany({
      where: { movementDate: { gte: startOfPeriod }, status: 'confirmed' },
      orderBy: { movementDate: 'asc' },
      include: { category: true, contact: true },
    }),
    prisma.financialMovement.findMany({
      where: { movementDate: { gte: startOfPrevPeriod, lt: startOfPeriod }, status: 'confirmed' },
      select: { amount: true, direction: true, movementDate: true },
    }),
    prisma.financialMovement.findMany({
      where: { status: 'confirmed' },
      orderBy: { movementDate: 'asc' },
      select: { amount: true, direction: true, movementDate: true },
    }),
  ])

  const currentIncome = currentMovements.filter(m => m.direction === 'in').reduce((sum, m) => sum + Number(m.amount), 0)
  const currentExpenses = currentMovements.filter(m => m.direction === 'out').reduce((sum, m) => sum + Number(m.amount), 0)
  const prevIncome = prevMovements.filter(m => m.direction === 'in').reduce((sum, m) => sum + Number(m.amount), 0)
  const prevExpenses = prevMovements.filter(m => m.direction === 'out').reduce((sum, m) => sum + Number(m.amount), 0)
  const incomeTrend = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0
  const expenseTrend = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0

  const pendingAR = await prisma.accountsReceivable.aggregate({ where: { status: { not: 'paid' } }, _sum: { balance: true }, _count: true })
  const pendingAP = await prisma.accountsPayable.aggregate({ where: { status: { not: 'paid' } }, _sum: { balance: true }, _count: true })
  const activeObligations = await prisma.obligation.aggregate({ where: { status: 'active' }, _sum: { balance: true }, _count: true })
  const overdueCount = await prisma.accountsReceivable.count({ where: { status: { not: 'paid' }, dueDate: { lt: now } } })

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const allObligations = await prisma.obligation.findMany({
    where: { status: { notIn: ['paid', 'completed', 'cancelled'] } },
    select: { id: true, name: true, type: true, balance: true, nextDueDate: true, endDate: true, priority: true },
  })

  const obligationReminders = {
    overdue: [] as { id: string; name: string; type: string; balance: number; daysOverdue: number; priority: string; dueDate?: string }[],
    dueToday: [] as { id: string; name: string; type: string; balance: number; priority: string; dueDate?: string }[],
    upcoming: [] as { id: string; name: string; type: string; balance: number; dueDate: string; priority: string }[],
  }

  for (const o of allObligations) {
    const dueDate = o.nextDueDate || o.endDate
    if (!dueDate) continue
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      obligationReminders.overdue.push({ ...o, daysOverdue: Math.abs(diffDays) })
    } else if (diffDays === 0) {
      obligationReminders.dueToday.push({ ...o })
    } else if (diffDays <= 7) {
      obligationReminders.upcoming.push({ ...o, dueDate: due.toISOString() })
    }
  }

  obligationReminders.overdue.sort((a, b) => b.daysOverdue - a.daysOverdue)

  const barData: { label: string; income: number; expenses: number }[] = []
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const dayNames = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']

  if (period === 'week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const dm = allMovements.filter(m => m.movementDate >= d && m.movementDate < next)
      barData.push({ label: dayNames[d.getDay()], income: dm.filter(m => m.direction === 'in').reduce((s, m) => s + Number(m.amount), 0), expenses: dm.filter(m => m.direction === 'out').reduce((s, m) => s + Number(m.amount), 0) })
    }
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const weekStart = new Date(monthStart)
    let weekNum = 1
    while (weekStart < monthEnd) {
      const wEnd = new Date(weekStart); wEnd.setDate(weekStart.getDate() + 7)
      const wm = allMovements.filter(m => m.movementDate >= weekStart && m.movementDate < (wEnd < monthEnd ? wEnd : monthEnd))
      barData.push({ label: `S${weekNum}`, income: wm.filter(m => m.direction === 'in').reduce((s, m) => s + Number(m.amount), 0), expenses: wm.filter(m => m.direction === 'out').reduce((s, m) => s + Number(m.amount), 0) })
      weekStart.setDate(weekStart.getDate() + 7)
      weekNum++
    }
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3)
    for (let i = 0; i < 3; i++) {
      const m = new Date(now.getFullYear(), quarter * 3 + i, 1)
      const mEnd = new Date(now.getFullYear(), quarter * 3 + i + 1, 1)
      const mm = allMovements.filter(mt => mt.movementDate >= m && mt.movementDate < mEnd)
      barData.push({ label: monthNames[m.getMonth()], income: mm.filter(mt => mt.direction === 'in').reduce((s, mt) => s + Number(mt.amount), 0), expenses: mm.filter(mt => mt.direction === 'out').reduce((s, mt) => s + Number(mt.amount), 0) })
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), i, 1)
      const mEnd = new Date(now.getFullYear(), i + 1, 1)
      const mm = allMovements.filter(mt => mt.movementDate >= m && mt.movementDate < mEnd)
      barData.push({ label: monthNames[m.getMonth()], income: mm.filter(mt => mt.direction === 'in').reduce((s, mt) => s + Number(mt.amount), 0), expenses: mm.filter(mt => mt.direction === 'out').reduce((s, mt) => s + Number(mt.amount), 0) })
    }
  }

  return {
    totalCash, totalBank, totalAssets: totalCash + totalBank,
    monthlyIncome: currentIncome, monthlyExpenses: currentExpenses, monthlyNet: currentIncome - currentExpenses,
    incomeTrend, expenseTrend,
    pendingAR: Number(pendingAR._sum.balance || 0), pendingARCount: pendingAR._count,
    pendingAP: Number(pendingAP._sum.balance || 0), pendingAPCount: pendingAP._count,
    obligationBalance: Number(activeObligations._sum.balance || 0), obligationCount: activeObligations._count,
    overdueCount, obligationReminders,
    recentMovements: currentMovements.slice(-10).reverse(), barData,
  }
}

function TrendBadge({ value, inverted }: { value: number; inverted?: boolean }) {
  if (Math.abs(value) < 0.1) return null
  const positive = inverted ? value < 0 : value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function BarChart({ data }: { data: { label: string; income: number; expenses: number }[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expenses)), 1)
  return (
    <div className="flex items-end gap-1 h-44 sm:h-52 px-1">
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
              <div className="flex-1 rounded-[3px] bg-success/60 hover:bg-success transition-colors duration-150 bar-chart-bar" style={{ height: `${Math.max(incomeH, 1)}%` }} />
              <div className="flex-1 rounded-[3px] bg-danger/40 hover:bg-danger/60 transition-colors duration-150 bar-chart-bar" style={{ height: `${Math.max(expenseH, 1)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

async function DashboardContent({ period }: { period: string }) {
  const data = await getDashboardData(period)

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Resumen financiero de tu negocio</p>
        </div>
        <PeriodFilter />
      </div>

      {/* Total patrimony — clean white card, no dark hero */}
      <div className="bg-card rounded-xl border border-border p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue/[0.04] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Patrimonio total</p>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 tabular-nums">{formatCurrency(data.totalAssets)}</p>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">Caja {formatCurrency(data.totalCash)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue" />
              <span className="text-xs text-muted-foreground">Bancos {formatCurrency(data.totalBank)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <Link href="/cash" className="group bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Caja</span>
            <div className="w-7 h-7 rounded-lg bg-blue/[0.08] flex items-center justify-center group-hover:bg-blue/[0.14] transition-colors duration-200">
              <Wallet size={14} className="text-blue" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(data.totalCash)}</p>
        </Link>

        <Link href="/banks" className="group bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Bancos</span>
            <div className="w-7 h-7 rounded-lg bg-primary/[0.04] flex items-center justify-center group-hover:bg-primary/[0.08] transition-colors duration-200">
              <CreditCard size={14} className="text-muted-foreground" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(data.totalBank)}</p>
        </Link>

        <div className="bg-card rounded-xl border border-border p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Ingresos</span>
            <div className="w-7 h-7 rounded-lg bg-success/[0.08] flex items-center justify-center">
              <ArrowDownLeft size={14} className="text-success" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight text-success">{formatCurrency(data.monthlyIncome)}</p>
          <TrendBadge value={data.incomeTrend} />
        </div>

        <div className="bg-card rounded-xl border border-border p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Gastos</span>
            <div className="w-7 h-7 rounded-lg bg-danger/[0.08] flex items-center justify-center">
              <ArrowUpRight size={14} className="text-danger" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight text-danger">{formatCurrency(data.monthlyExpenses)}</p>
          <TrendBadge value={data.expenseTrend} inverted />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card rounded-xl border border-border p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm">Ingresos vs Gastos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Evolucion del periodo</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success/60" />Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger/40" />Gastos</span>
            </div>
          </div>
          <BarChart data={data.barData} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 animate-slide-up">
            <h3 className="font-semibold text-sm mb-4">Flujo del periodo</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Ingresos</span>
                <span className="text-sm font-semibold tabular-nums text-success">{formatCurrency(data.monthlyIncome)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Gastos</span>
                <span className="text-sm font-semibold tabular-nums text-danger">{formatCurrency(data.monthlyExpenses)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">Neto</span>
                <span className={`text-sm font-bold tabular-nums ${data.monthlyNet >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(data.monthlyNet)}</span>
              </div>
            </div>
          </div>

          {data.overdueCount > 0 && (
            <Link href="/receivables" className="flex items-center gap-3 bg-danger/[0.04] border border-danger/10 rounded-xl p-3.5 hover:bg-danger/[0.07] transition-colors animate-slide-up">
              <AlertTriangle size={15} className="text-danger shrink-0" />
              <div>
                <p className="text-xs font-medium text-danger">{`${data.overdueCount} vencida${data.overdueCount !== 1 ? 's' : ''}`}</p>
                <p className="text-[11px] text-danger/60">CxC por revisar</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {(data.obligationReminders.overdue.length > 0 || data.obligationReminders.dueToday.length > 0 || data.obligationReminders.upcoming.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Recordatorios de obligaciones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {data.obligationReminders.overdue.length > 0 && (
              <Link href="/obligations" className="flex items-center gap-2.5 bg-danger/[0.04] border border-danger/10 rounded-xl p-3 hover:bg-danger/[0.07] transition-colors">
                <AlertTriangle size={14} className="text-danger shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-danger">{data.obligationReminders.overdue.length} vencida{data.obligationReminders.overdue.length !== 1 ? 's' : ''}</p>
                  <p className="text-[10px] text-danger/60 truncate">{data.obligationReminders.overdue.map(o => o.name).join(', ')}</p>
                </div>
              </Link>
            )}
            {data.obligationReminders.dueToday.length > 0 && (
              <Link href="/obligations" className="flex items-center gap-2.5 bg-warning/[0.04] border border-warning/10 rounded-xl p-3 hover:bg-warning/[0.07] transition-colors">
                <AlertTriangle size={14} className="text-warning shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-warning">{data.obligationReminders.dueToday.length} vence{data.obligationReminders.dueToday.length !== 1 ? 'n' : ''} hoy</p>
                  <p className="text-[10px] text-warning/60 truncate">{data.obligationReminders.dueToday.map(o => o.name).join(', ')}</p>
                </div>
              </Link>
            )}
            {data.obligationReminders.upcoming.length > 0 && (
              <Link href="/obligations" className="flex items-center gap-2.5 bg-blue/[0.04] border border-blue/10 rounded-xl p-3 hover:bg-blue/[0.07] transition-colors">
                <AlertTriangle size={14} className="text-blue shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-blue">{data.obligationReminders.upcoming.length} próximas (7 días)</p>
                  <p className="text-[10px] text-blue/60 truncate">{data.obligationReminders.upcoming.map(o => o.name).join(', ')}</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Link href="/receivables" className="block bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">CxC</span>
              <span className="text-[11px] bg-success/[0.08] text-success px-1.5 py-0.5 rounded-full font-medium">{data.pendingARCount}</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(data.pendingAR)}</p>
          </Link>
          <Link href="/payables" className="block bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">CxP</span>
              <span className="text-[11px] bg-warning/[0.08] text-warning px-1.5 py-0.5 rounded-full font-medium">{data.pendingAPCount}</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(data.pendingAP)}</p>
          </Link>
          <Link href="/obligations" className="block bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Obligaciones</span>
              <span className="text-[11px] bg-primary/[0.06] text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{data.obligationCount}</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(data.obligationBalance)}</p>
          </Link>
        </div>

        <div className="lg:col-span-2 bg-card rounded-xl border border-border animate-slide-up">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Actividad reciente</h2>
            <Link href="/cash" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Ver todo</Link>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {data.recentMovements.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Receipt size={18} className="text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium">Sin movimientos</p>
                <p className="text-xs text-muted-foreground mt-0.5">Los movimientos apareceran aqui</p>
              </div>
            ) : (
              data.recentMovements.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.direction === 'in' ? 'bg-success/[0.08] text-success' : 'bg-danger/[0.08] text-danger'}`}>
                    {m.direction === 'in' ? <ArrowDownLeft size={14} strokeWidth={1.8} /> : <ArrowUpRight size={14} strokeWidth={1.8} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.description || m.movementType}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="font-mono text-[11px] text-muted-foreground/70">{m.transactionId}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{m.category?.name || m.movementType}</span>
                      {m.contact && <><span className="text-muted-foreground/40">·</span><span>{m.contact.name}</span></>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${m.direction === 'in' ? 'text-success' : 'text-danger'}`}>
                      {m.direction === 'in' ? '+' : '-'}{formatCurrency(Number(m.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.movementDate)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period } = await searchParams

  return (
    <Suspense fallback={
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
          </div>
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
      </div>
    }>
      <DashboardContent period={period || 'month'} />
    </Suspense>
  )
}
