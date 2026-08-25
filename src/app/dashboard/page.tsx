export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getTotalCashBalance, getTotalBankBalance } from '@/lib/balances'
import { formatCurrency, movementTypeLabel } from '@/lib/utils'
import {
  Wallet, Building2, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, Clock, ArrowRight, TrendingUp, TrendingDown,
  Activity, DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import { format, subDays, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

function getGreeting(): string {
  const now = new Date()
  const hour = now.getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function TrendBadge({ value, inverted }: { value: number; inverted?: boolean }) {
  if (Math.abs(value) < 0.1) return null
  const positive = inverted ? value < 0 : value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function FlowChart({ data }: { data: { label: string; income: number; expenses: number }[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expenses)), 1)
  return (
    <div className="flex items-end gap-2 h-48 px-1">
      {data.map((d, i) => {
        const incomeH = (d.income / maxVal) * 100
        const expenseH = (d.expenses / maxVal) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              <div className="font-medium mb-0.5">{d.label}</div>
              <div className="text-emerald-400 font-medium">+{formatCurrency(d.income)}</div>
              <div className="text-red-400 font-medium">-{formatCurrency(d.expenses)}</div>
            </div>
            <div className="w-full flex gap-[3px] items-end" style={{ height: '100%' }}>
              <div
                className="flex-1 rounded-[3px] bg-emerald-400/70 hover:bg-emerald-500 transition-colors duration-150 bar-chart-bar"
                style={{ height: `${Math.max(incomeH, 1)}%` }}
              />
              <div
                className="flex-1 rounded-[3px] bg-red-400/40 hover:bg-red-500/60 transition-colors duration-150 bar-chart-bar"
                style={{ height: `${Math.max(expenseH, 1)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function TimelineItem({ m }: {
  m: { id: string; direction: string; movementType: string; description: string | null; amount: number; createdAt: Date }
}) {
  const isIn = m.direction === 'in'
  return (
    <div className="flex items-start gap-4 relative">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {isIn ? <ArrowDownLeft size={14} strokeWidth={2} /> : <ArrowUpRight size={14} strokeWidth={2} />}
        </div>
        <div className="w-px flex-1 bg-border min-h-[20px]" />
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">
            {m.description || movementTypeLabel(m.movementType)}
          </p>
          <p className={`text-sm font-bold tabular-nums shrink-0 ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
            {isIn ? '+' : '-'}{formatCurrency(Number(m.amount))}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{movementTypeLabel(m.movementType)}</p>
      </div>
    </div>
  )
}

async function getDashboardData() {
  const companyId = 'default'
  const now = new Date()
  const today = startOfDay(now)
  const sevenDaysAgo = subDays(today, 6)

  const [totalCash, totalBank] = await Promise.all([
    getTotalCashBalance(companyId),
    getTotalBankBalance(companyId),
  ])

  const [
    pendingARAgg,
    pendingAPAgg,
    obligationAgg,
    overdueAR,
    overdueAP,
    upcomingObligations,
    pendingMovements,
    last10Movements,
    last30DaysMovements,
    flowData,
  ] = await Promise.all([
    prisma.accountsReceivable.aggregate({
      where: { status: { notIn: ['paid', 'cancelled'] } },
      _sum: { balance: true },
      _count: true,
    }),
    prisma.accountsPayable.aggregate({
      where: { status: { notIn: ['paid', 'cancelled'] } },
      _sum: { balance: true },
      _count: true,
    }),
    prisma.obligation.aggregate({
      where: { status: 'active' },
      _sum: { balance: true },
    }),
    prisma.accountsReceivable.findMany({
      where: { status: { notIn: ['paid', 'cancelled'] }, dueDate: { lt: now } },
      select: { id: true, description: true, balance: true, dueDate: true, contact: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.accountsPayable.findMany({
      where: { status: { notIn: ['paid', 'cancelled'] }, dueDate: { lt: now } },
      select: { id: true, description: true, balance: true, dueDate: true, contact: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.obligation.findMany({
      where: {
        status: 'active',
        nextDueDate: { gte: today, lte: subDays(today, -7) },
      },
      select: { id: true, name: true, type: true, nextDueDate: true, paymentAmount: true, priority: true },
      orderBy: { nextDueDate: 'asc' },
    }),
    prisma.financialMovement.count({
      where: { status: 'pending' },
    }),
    prisma.financialMovement.findMany({
      where: { status: 'confirmed' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, direction: true, movementType: true,
        description: true, amount: true, createdAt: true,
      },
    }),
    prisma.financialMovement.findMany({
      where: { status: 'confirmed', movementDate: { gte: subDays(now, 60) } },
      select: { amount: true, direction: true, movementDate: true },
    }),
    prisma.financialMovement.findMany({
      where: { status: 'confirmed', movementDate: { gte: sevenDaysAgo } },
      select: { amount: true, direction: true, movementDate: true },
    }),
  ])

  const pendingAR = Number(pendingARAgg._sum.balance || 0)
  const pendingAP = Number(pendingAPAgg._sum.balance || 0)
  const obligationBalance = Number(obligationAgg._sum.balance || 0)
  const totalAvailable = totalCash + totalBank - pendingAP - obligationBalance

  const prevThirtyStart = subDays(sevenDaysAgo, 30)
  const prevThirtyEnd = sevenDaysAgo
  const prevMovements = last30DaysMovements.filter(
    m => m.movementDate >= prevThirtyStart && m.movementDate < prevThirtyEnd
  )
  const prevIncome = prevMovements.filter(m => m.direction === 'in').reduce((s, m) => s + Number(m.amount), 0)
  const prevExpenses = prevMovements.filter(m => m.direction === 'out').reduce((s, m) => s + Number(m.amount), 0)
  const prevNet = prevIncome - prevExpenses

  const currentIncome = last30DaysMovements.filter(
    m => m.movementDate >= sevenDaysAgo && m.direction === 'in'
  ).reduce((s, m) => s + Number(m.amount), 0)
  const currentExpenses = last30DaysMovements.filter(
    m => m.movementDate >= sevenDaysAgo && m.direction === 'out'
  ).reduce((s, m) => s + Number(m.amount), 0)
  const currentNet = currentIncome - currentExpenses

  const netTrend = prevNet !== 0 ? ((currentNet - prevNet) / Math.abs(prevNet)) * 100 : 0

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const flow7Days: { label: string; income: number; expenses: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dayDate = subDays(today, i)
    const nextDay = subDays(today, i - 1)
    const dayMoves = flowData.filter(m => m.movementDate >= dayDate && m.movementDate < nextDay)
    flow7Days.push({
      label: dayNames[dayDate.getDay()],
      income: dayMoves.filter(m => m.direction === 'in').reduce((s, m) => s + Number(m.amount), 0),
      expenses: dayMoves.filter(m => m.direction === 'out').reduce((s, m) => s + Number(m.amount), 0),
    })
  }

  return {
    totalAvailable, totalCash, totalBank, pendingAR, pendingAP,
    obligationBalance, pendingARCount: pendingARAgg._count,
    pendingAPCount: pendingAPAgg._count,
    overdueAR, overdueAP, upcomingObligations,
    pendingMovements, last10Movements, flow7Days, netTrend,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const greeting = getGreeting()

  const totalCommitments = data.pendingAP + data.obligationBalance

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {greeting}, Aurum.
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Tu posición financiera</p>
      </div>

      {/* ── Position Card ── */}
      <div className="bg-white rounded-xl border border-border p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2"
          style={{ background: 'radial-gradient(circle, rgba(184,134,11,0.06) 0%, transparent 70%)' }} />
        <div className="relative">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Posición neta</p>
          <div className="flex items-end gap-3 mt-2">
            <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums"
              style={{ color: data.totalAvailable >= 0 ? undefined : '#DC2626' }}>
              {formatCurrency(data.totalAvailable)}
            </p>
            <TrendBadge value={data.netTrend} />
          </div>
          <div className="flex items-center gap-6 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Caja {formatCurrency(data.totalCash)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span className="text-xs text-muted-foreground">Bancos {formatCurrency(data.totalBank)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#B8860B' }} />
              <span className="text-xs text-muted-foreground">CxC {formatCurrency(data.pendingAR)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Comprometido {formatCurrency(totalCommitments)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Flow Chart ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-sm">Flujo últimos 7 días</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ingresos vs gastos diarios</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400/70" />Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400/40" />Gastos
            </span>
          </div>
        </div>
        <FlowChart data={data.flow7Days} />
      </div>

      {/* ── Where is the money ── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">Dónde está el dinero</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          <Link href="/cash" className="group bg-white rounded-xl border border-border p-5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground">Caja</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-200">
                <Wallet size={16} className="text-emerald-600" strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(data.totalCash)}</p>
          </Link>

          <Link href="/banks" className="group bg-white rounded-xl border border-border p-5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground">Bancos</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                <Building2 size={16} className="text-blue-600" strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(data.totalBank)}</p>
          </Link>

          <Link href="/receivables" className="group bg-white rounded-xl border border-border p-5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground">Por cobrar</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:opacity-90 transition-colors duration-200"
                style={{ backgroundColor: 'rgba(184,134,11,0.08)' }}>
                <ArrowDownLeft size={16} style={{ color: '#B8860B' }} strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(data.pendingAR)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{data.pendingARCount} documento{data.pendingARCount !== 1 ? 's' : ''}</p>
          </Link>

          <Link href="/payables" className="group bg-white rounded-xl border border-border p-5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground">Comprometido</span>
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors duration-200">
                <ArrowUpRight size={16} className="text-red-600" strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(totalCommitments)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">CxP + obligaciones</p>
          </Link>
        </div>
      </div>

      {/* ── Requires attention ── */}
      {(data.overdueAR.length > 0 || data.overdueAP.length > 0 || data.upcomingObligations.length > 0 || data.pendingMovements > 0) && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">Requiere atención</h2>
          <div className="space-y-2">
            {data.overdueAR.length > 0 && (
              <Link href="/receivables" className="flex items-center justify-between bg-white rounded-xl border border-border p-4 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">CxC vencidas</p>
                    <p className="text-xs text-muted-foreground">{data.overdueAR.length} documento{data.overdueAR.length !== 1 ? 's' : ''} · {formatCurrency(data.overdueAR.reduce((s, r) => s + r.balance, 0))}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>
            )}

            {data.overdueAP.length > 0 && (
              <Link href="/payables" className="flex items-center justify-between bg-white rounded-xl border border-border p-4 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">CxP vencidas</p>
                    <p className="text-xs text-muted-foreground">{data.overdueAP.length} documento{data.overdueAP.length !== 1 ? 's' : ''} · {formatCurrency(data.overdueAP.reduce((s, p) => s + p.balance, 0))}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>
            )}

            {data.upcomingObligations.length > 0 && (
              <Link href="/obligations" className="flex items-center justify-between bg-white rounded-xl border border-border p-4 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Obligaciones próximas</p>
                    <p className="text-xs text-muted-foreground">{data.upcomingObligations.length} en los próximos 7 días · {formatCurrency(data.upcomingObligations.reduce((s, o) => s + (o.paymentAmount || 0), 0))}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>
            )}

            {data.pendingMovements > 0 && (
              <Link href="/movements" className="flex items-center justify-between bg-white rounded-xl border border-border p-4 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Activity size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Movimientos pendientes</p>
                    <p className="text-xs text-muted-foreground">{data.pendingMovements} movimiento{data.pendingMovements !== 1 ? 's' : ''} por confirmar</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Activity timeline ── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">Actividad reciente</h2>
        <div className="bg-white rounded-xl border border-border p-6">
          {data.last10Movements.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <DollarSign size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin movimientos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Los movimientos aparecerán aquí</p>
            </div>
          ) : (
            <div>
              {data.last10Movements.map((m) => (
                <TimelineItem key={m.id} m={m} />
              ))}
              <Link href="/movements" className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors pt-2">
                Ver todos los movimientos
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
