'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Wallet, Building2, Activity } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface BankAccount {
  id: string
  bankName: string
  accountType: string | null
  accountNumber: string | null
  balance: number
}

interface Movement {
  id: string
  transactionId: string
  movementType: string
  amount: number
  direction: string
  movementDate: string
  description: string | null
  status: string
  category?: { name: string } | null
  contact?: { name: string } | null
}

export default function TreasuryPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [cashBalance, setCashBalance] = useState(0)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [banksRes, cashRes, movementsRes] = await Promise.all([
          fetch('/api/bank-accounts'),
          fetch('/api/movements?sourceType=cash_register&limit=9999'),
          fetch('/api/movements?limit=20'),
        ])

        const banksData = await banksRes.json()
        const cashData = await cashRes.json()
        const movementsData = await movementsRes.json()

        setBankAccounts(banksData)

        const cashMovements = cashData.movements || cashData
        const cashIn = cashMovements
          .filter((m: Movement) => m.direction === 'incoming' && m.status === 'confirmed')
          .reduce((sum: number, m: Movement) => sum + m.amount, 0)
        const cashOut = cashMovements
          .filter((m: Movement) => m.direction === 'outgoing' && m.status === 'confirmed')
          .reduce((sum: number, m: Movement) => sum + m.amount, 0)
        setCashBalance(cashIn - cashOut)

        setMovements(movementsData.movements || movementsData)
      } catch {
        console.error('Error loading treasury data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const bankTotal = bankAccounts.reduce((sum, a) => sum + a.balance, 0)
  const consolidatedBalance = cashBalance + bankTotal

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthMovements = movements.filter((m) => {
    const d = new Date(m.movementDate)
    return d >= monthStart && m.status === 'confirmed'
  })
  const monthIncome = monthMovements
    .filter((m) => m.direction === 'incoming')
    .reduce((sum, m) => sum + m.amount, 0)
  const monthExpenses = monthMovements
    .filter((m) => m.direction === 'outgoing')
    .reduce((sum, m) => sum + m.amount, 0)

  const movementTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      sale: 'Venta',
      purchase: 'Compra',
      expense: 'Gasto',
      income: 'Ingreso',
      transfer: 'Transferencia',
      payment: 'Pago',
    }
    return map[t] || t
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'

  if (loading) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tesoreria</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Vision consolidada del flujo de caja</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tesoreria</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Vision consolidada del flujo de caja</p>
      </div>

      <div className="bg-blue text-white rounded-xl p-5">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">Saldo consolidado</p>
        <p className="text-3xl font-bold tabular-nums mt-2 tracking-tight">{formatCurrency(consolidatedBalance)}</p>
        <p className="text-xs opacity-70 mt-1">Efectivo + Bancos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-success/[0.08] flex items-center justify-center">
              <Wallet size={13} className="text-success" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Efectivo</span>
          </div>
          <p className="text-lg font-bold tabular-nums tracking-tight">{formatCurrency(cashBalance)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/[0.06] flex items-center justify-center">
              <Building2 size={13} className="text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bancos</span>
          </div>
          <p className="text-lg font-bold tabular-nums tracking-tight">{formatCurrency(bankTotal)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-warning/[0.08] flex items-center justify-center">
              <Activity size={13} className="text-warning" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cuentas</span>
          </div>
          <p className="text-lg font-bold tabular-nums tracking-tight">{bankAccounts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ingresos del mes</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-success">+{formatCurrency(monthIncome)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Egresos del mes</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-danger">-{formatCurrency(monthExpenses)}</p>
        </div>
      </div>

      {bankAccounts.length > 0 && (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="font-semibold text-sm">Cuentas bancarias</h2>
          </div>
          <div className="divide-y divide-border">
            {bankAccounts.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/[0.06] flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.bankName}</p>
                  <p className="text-xs text-muted-foreground">{a.accountNumber || 'Sin numero'}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(a.balance)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Movimientos recientes</h2>
        </div>
        <div className="divide-y divide-border">
          {movements.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin movimientos recientes</p>
            </div>
          ) : (
            movements.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  m.direction === 'incoming'
                    ? 'bg-success/[0.08] text-success'
                    : 'bg-danger/[0.08] text-danger'
                }`}>
                  {m.direction === 'incoming' ? <ArrowDownLeft size={14} strokeWidth={1.8} /> : <ArrowUpRight size={14} strokeWidth={1.8} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.description || movementTypeLabel(m.movementType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono text-[11px] text-muted-foreground/70 mr-1">{m.transactionId}</span>
                    {m.category?.name || movementTypeLabel(m.movementType)}
                    {m.contact && ` · ${m.contact.name}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${
                    m.direction === 'incoming' ? 'text-success' : 'text-danger'
                  }`}>
                    {m.direction === 'incoming' ? '+' : '-'}{formatCurrency(m.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.movementDate)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
