export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCashRegisterBalance } from '@/lib/balances'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react'
import MovementButton from '@/components/movement-button'

async function getCashData() {
  const cashRegisters = await prisma.cashRegister.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
  })

  const movements = await prisma.financialMovement.findMany({
    where: { sourceType: 'cash_register', status: 'confirmed' },
    orderBy: { movementDate: 'desc' },
    take: 50,
    include: {
      category: true,
      contact: true,
    },
  })

  const register = cashRegisters[0] || null
  const calculatedBalance = register ? await getCashRegisterBalance(register.id) : 0
  const currentBalance = register?.physicalCount != null ? Number(register.physicalCount) : calculatedBalance

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayMovements = movements.filter(m => {
    const d = new Date(m.movementDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  const totalIncome = todayMovements
    .filter(m => m.direction === 'in')
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const totalExpenses = todayMovements
    .filter(m => m.direction === 'out')
    .reduce((sum, m) => sum + Number(m.amount), 0)

  return {
    register,
    currentBalance,
    calculatedBalance,
    movements,
    todayIncome: totalIncome,
    todayExpenses: totalExpenses,
    todayNet: totalIncome - totalExpenses,
  }
}

export default async function CashPage() {
  const data = await getCashData()

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Estado actual y movimientos del dia</p>
        </div>
        <MovementButton registerId={data.register?.id} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title={data.register?.physicalCount != null ? 'Saldo real' : 'Balance actual'}
          value={data.currentBalance}
          icon={<Wallet size={15} strokeWidth={1.8} />}
          variant="primary"
        />
        <StatCard
          title="Ingresos hoy"
          value={data.todayIncome}
          icon={<TrendingUp size={15} strokeWidth={1.8} />}
          variant="success"
        />
        <StatCard
          title="Gastos hoy"
          value={data.todayExpenses}
          icon={<TrendingDown size={15} strokeWidth={1.8} />}
          variant="danger"
        />
        <StatCard
          title="Neto hoy"
          value={data.todayNet}
          icon={<RefreshCw size={15} strokeWidth={1.8} />}
          variant={data.todayNet >= 0 ? 'success' : 'danger'}
        />
      </div>

      {data.register && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue/[0.08] flex items-center justify-center">
                <Wallet size={16} className="text-blue" />
              </div>
              <div>
                <p className="text-sm font-medium">{data.register.name}</p>
                <p className="text-xs text-muted-foreground">
                  Balance inicial: {formatCurrency(Number(data.register.openingBalance))}
                  {data.register.physicalCount != null && (
                    <> · Calculado: {formatCurrency(data.calculatedBalance)}</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                data.register.status === 'open'
                  ? 'bg-success/[0.08] text-success'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {data.register.status === 'open' ? 'Abierta' : 'Cerrada'}
              </span>
              {data.register.physicalCount != null && data.register.difference != null && Number(data.register.difference) !== 0 && (
                <span className={`text-xs tabular-nums font-medium ${Number(data.register.difference) > 0 ? 'text-success' : 'text-danger'}`}>
                  Diferencia: {formatCurrency(Number(data.register.difference))}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Movimientos recientes</h2>
        </div>
        <div className="divide-y divide-border">
          {data.movements.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Wallet size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin movimientos registrados</p>
              <p className="text-xs text-muted-foreground mt-0.5">Haz clic en Registrar para agregar el primero</p>
            </div>
          ) : (
            data.movements.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  m.direction === 'in'
                    ? 'bg-success/[0.08] text-success'
                    : 'bg-danger/[0.08] text-danger'
                }`}>
                  {m.direction === 'in' ? <ArrowDownLeft size={14} strokeWidth={1.8} /> : <ArrowUpRight size={14} strokeWidth={1.8} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.description || m.movementType}
                  </p>
                  <p className="text-xs text-muted-foreground truncate min-w-0">
                    <span className="font-mono text-[11px] text-muted-foreground/70 mr-1">{m.transactionId}</span>
                    {m.category?.name || m.movementType}
                    {m.contact && ` · ${m.contact.name}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${
                    m.direction === 'in' ? 'text-success' : 'text-danger'
                  }`}>
                    {m.direction === 'in' ? '+' : '-'}{formatCurrency(Number(m.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(m.movementDate)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  variant,
}: {
  title: string
  value: number
  icon: React.ReactNode
  variant: 'primary' | 'success' | 'danger'
}) {
  const variantClasses = {
    primary: 'bg-blue/[0.08] text-blue',
    success: 'bg-success/[0.08] text-success',
    danger: 'bg-danger/[0.08] text-danger',
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${variantClasses[variant]}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold tabular-nums tracking-tight">
        {formatCurrency(value)}
      </p>
    </div>
  )
}
