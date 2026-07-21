'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Wallet, Building2, Activity, ClipboardCheck, X, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Modal from '@/components/ui/modal'

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

interface ArqueoRow {
  name: string
  icon: string
  expected: number
  physical: string
}

export default function TreasuryPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [cashBalance, setCashBalance] = useState(0)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [arqueoOpen, setArqueoOpen] = useState(false)
  const [arqueoRows, setArqueoRows] = useState<ArqueoRow[]>([])
  const [savingArqueo, setSavingArqueo] = useState(false)
  const [arqueoDone, setArqueoDone] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [banksRes, cashRes, movementsRes] = await Promise.all([
          fetch('/api/bank-accounts'),
          fetch('/api/movements?sourceType=cash_register&limit=9999'),
          fetch('/api/movements?limit=50'),
        ])

        const banksData = await banksRes.json()
        const cashData = await cashRes.json()
        const movementsData = await movementsRes.json()

        setBankAccounts(banksData)

        const cashMovements = (cashData.movements || cashData).filter((m: Movement) => m.status === 'confirmed')
        const cashIn = cashMovements
          .filter((m: Movement) => m.direction === 'in')
          .reduce((sum: number, m: Movement) => sum + m.amount, 0)
        const cashOut = cashMovements
          .filter((m: Movement) => m.direction === 'out')
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
    .filter((m) => m.direction === 'in')
    .reduce((sum, m) => sum + m.amount, 0)
  const monthExpenses = monthMovements
    .filter((m) => m.direction === 'out')
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

  const openArqueo = () => {
    const rows: ArqueoRow[] = [
      { name: 'Efectivo (Caja)', icon: '💵', expected: cashBalance, physical: String(cashBalance) },
      ...bankAccounts.map(a => ({
        name: a.bankName,
        icon: a.bankName === 'Nequi' ? '📱' : a.bankName === 'Bancolombia' ? '💳' : '🏦',
        expected: a.balance,
        physical: String(a.balance),
      })),
    ]
    setArqueoRows(rows)
    setArqueoDone(false)
    setArqueoOpen(true)
  }

  const updateRow = (index: number, value: string) => {
    const updated = [...arqueoRows]
    updated[index] = { ...updated[index], physical: value }
    setArqueoRows(updated)
  }

  const totalExpected = arqueoRows.reduce((s, r) => s + r.expected, 0)
  const totalPhysical = arqueoRows.reduce((s, r) => s + (parseFloat(r.physical) || 0), 0)
  const totalDiff = totalPhysical - totalExpected

  const handleSaveArqueo = async () => {
    setSavingArqueo(true)
    await new Promise(r => setTimeout(r, 500))
    setSavingArqueo(false)
    setArqueoDone(true)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tesoreria</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Vision consolidada del flujo de caja</p>
          </div>
          <button onClick={openArqueo} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors">
            <ClipboardCheck size={14} strokeWidth={1.8} />
            Realizar arqueo
          </button>
        </div>

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
                  m.direction === 'in'
                    ? 'bg-success/[0.08] text-success'
                    : 'bg-danger/[0.08] text-danger'
                }`}>
                  {m.direction === 'in' ? <ArrowDownLeft size={14} strokeWidth={1.8} /> : <ArrowUpRight size={14} strokeWidth={1.8} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.description || movementTypeLabel(m.movementType)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-mono text-[11px] text-muted-foreground/70 mr-1">{m.transactionId}</span>
                    {m.category?.name || movementTypeLabel(m.movementType)}
                    {m.contact && ` · ${m.contact.name}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${
                    m.direction === 'in' ? 'text-success' : 'text-danger'
                  }`}>
                    {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.movementDate)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {arqueoOpen && (
        <Modal title="Arqueo de tesorería" subtitle="Conteo físico vs saldo esperado" onClose={() => setArqueoOpen(false)} wide>
          <div className="p-4 sm:p-5 space-y-4">
            {arqueoDone ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-success/[0.08] flex items-center justify-center mx-auto mb-3">
                  <Check size={20} className="text-success" />
                </div>
                <p className="font-semibold">Arqueo completado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalDiff === 0
                    ? 'Los saldos coinciden exactamente'
                    : 'Diferencia: ' + formatCurrency(Math.abs(totalDiff)) + ' (' + (totalDiff > 0 ? 'sobra' : 'falta') + ')'}
                </p>
                <button onClick={() => setArqueoOpen(false)} className="mt-4 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium">Cerrar</button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left font-medium pb-2 pl-2">Cuenta</th>
                        <th className="text-right font-medium pb-2">Esperado</th>
                        <th className="text-right font-medium pb-2">Físico</th>
                        <th className="text-right font-medium pb-2 pr-2">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {arqueoRows.map((row, i) => {
                        const physical = parseFloat(row.physical) || 0
                        const diff = physical - row.expected
                        return (
                          <tr key={i} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 pl-2">
                              <span className="mr-1.5">{row.icon}</span>
                              <span className="font-medium">{row.name}</span>
                            </td>
                            <td className="text-right py-2.5 tabular-nums">{formatCurrency(row.expected)}</td>
                            <td className="text-right py-2.5">
                              <input
                                type="number"
                                step="any"
                                value={row.physical}
                                onChange={(e) => updateRow(i, e.target.value)}
                                className="w-28 text-right px-2 py-1 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 text-xs tabular-nums"
                              />
                            </td>
                            <td className={`text-right py-2.5 pr-2 tabular-nums font-medium ${diff === 0 ? '' : diff > 0 ? 'text-success' : 'text-danger'}`}>
                              {diff === 0 ? '\u2014' : (diff > 0 ? '+' : '') + formatCurrency(diff)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-semibold">
                        <td className="py-2.5 pl-2">TOTAL</td>
                        <td className="text-right py-2.5 tabular-nums">{formatCurrency(totalExpected)}</td>
                        <td className="text-right py-2.5 tabular-nums">{formatCurrency(totalPhysical)}</td>
                        <td className={`text-right py-2.5 pr-2 tabular-nums ${totalDiff === 0 ? '' : totalDiff > 0 ? 'text-success' : 'text-danger'}`}>
                          {totalDiff === 0 ? '\u2014' : (totalDiff > 0 ? '+' : '') + formatCurrency(totalDiff)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {totalDiff !== 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/[0.06] border border-warning/10">
                    <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Hay una diferencia de <strong className="text-foreground">{formatCurrency(Math.abs(totalDiff))}</strong>{' '}
                      ({totalDiff > 0 ? 'sobrante' : 'faltante'}).
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setArqueoOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">Cancelar</button>
                  <button onClick={handleSaveArqueo} disabled={savingArqueo} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors disabled:opacity-50">
                    {savingArqueo ? <Loader2 size={12} className="animate-spin" /> : null}
                    {savingArqueo ? 'Guardando...' : 'Finalizar arqueo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
