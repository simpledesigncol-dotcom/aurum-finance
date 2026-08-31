'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Calculator, Loader2, Check,
} from 'lucide-react'
import { formatCurrency, formatDate, formatShortDate, movementTypeLabel } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import MovementButton from '@/components/movement-button'

interface CashRegisterData {
  id: string
  name: string
  type: string
  openingBalance: number
  status: string
  physicalCount: number | null
  difference: number | null
  balance: number
  today?: { income: number; expenses: number }
}

interface Movement {
  id: string
  transactionId: string
  movementType: string
  amount: number
  direction: string
  movementDate: string
  description: string | null
  sourceId: string
  contact: { name: string } | null
}

interface Reconciliation {
  id: string
  registerId: string
  systemBalance: number
  physicalCount: number
  difference: number
  notes: string | null
  createdAt: string
  reconciler: { name: string } | null
}

export default function CashPage() {
  const [general, setGeneral] = useState<CashRegisterData | null>(null)
  const [minor, setMinor] = useState<CashRegisterData | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [physicalCount, setPhysicalCount] = useState('')
  const [arqueoNotes, setArqueoNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoadError(null)
      const [regRes, movRes, recRes] = await Promise.all([
        fetch('/api/cash-register/default'),
        fetch('/api/movements?sourceType=cash_register&limit=200'),
        fetch('/api/cash-register/reconciliations?limit=10'),
      ])

      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}))
        throw new Error(err.error || `Error ${regRes.status} al cargar cajas`)
      }

      const regData = await regRes.json()
      const movData = movRes.ok ? await movRes.json() : { movements: [] }
      const recData = recRes.ok ? await recRes.json() : { reconciliations: [] }

      setGeneral(regData.general || null)
      setMinor(regData.minor || null)
      setMovements(Array.isArray(movData.movements) ? movData.movements : [])
      setReconciliations(Array.isArray(recData.reconciliations) ? recData.reconciliations : [])
    } catch (e) {
      console.error('Error fetching cash data:', e)
      setLoadError(e instanceof Error ? e.message : 'Error al cargar datos de caja')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const getRecentMovements = (registerId: string, limit = 3) => {
    return movements.filter((m) => m.sourceId === registerId).slice(0, limit)
  }

  const handleArqueo = async () => {
    if (!minor || !physicalCount) return
    const count = parseFloat(physicalCount)
    if (isNaN(count) || count < 0) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/cash-register/reconciliations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registerId: minor.id,
            physicalCount: count,
            notes: arqueoNotes || null,
          }),
        })
        if (!res.ok) throw new Error('Failed')
        toast('success', 'Arqueo registrado correctamente')
        setPhysicalCount('')
        setArqueoNotes('')
        fetchData()
      } catch {
        toast('error', 'Error al registrar el arqueo')
      }
    })
  }

  const allMovements = [...movements].sort(
    (a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime()
  )

  if (loading) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border p-5 space-y-4">
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-danger font-medium mb-2">{loadError}</p>
          <button onClick={fetchData} className="text-xs text-primary hover:underline">Reintentar</button>
        </div>
      </div>
    )
  }

  const generalStats = general
    ? { ...(general.today || { income: 0, expenses: 0 }), net: (general.today?.income || 0) - (general.today?.expenses || 0) }
    : { income: 0, expenses: 0, net: 0 }
  const minorStats = minor
    ? { ...(minor.today || { income: 0, expenses: 0 }), net: (minor.today?.income || 0) - (minor.today?.expenses || 0) }
    : { income: 0, expenses: 0, net: 0 }
  const generalRecent = general ? getRecentMovements(general.id) : []
  const minorRecent = minor ? getRecentMovements(minor.id) : []
  const minorDifference = minor && physicalCount
    ? parseFloat(physicalCount) - (minor.balance)
    : null

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Control de caja general y caja menor</p>
        </div>
        <MovementButton registerId={general?.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue/[0.08] flex items-center justify-center">
                <Wallet size={16} className="text-blue" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">{general?.name || 'Caja General'}</h2>
                <p className="text-xs text-muted-foreground">Balance inicial: {formatCurrency(general?.openingBalance || 0)}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-success/[0.08] text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {general?.status === 'open' ? 'Abierta' : 'Cerrada'}
            </span>
          </div>

          <p className="text-2xl font-bold tabular-nums tracking-tight mb-4">{formatCurrency(general?.balance || 0)}</p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg bg-muted/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={12} className="text-success" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Ingresos</span>
              </div>
              <p className="text-sm font-semibold tabular-nums text-success">{formatCurrency(generalStats.income)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={12} className="text-danger" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Gastos</span>
              </div>
              <p className="text-sm font-semibold tabular-nums text-danger">{formatCurrency(generalStats.expenses)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Neto</span>
              <p className={`text-sm font-semibold tabular-nums ${generalStats.net >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(generalStats.net)}
              </p>
            </div>
          </div>

          {generalRecent.length > 0 && (
            <div className="space-y-0 divide-y divide-border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5">Últimos movimientos</p>
              {generalRecent.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${m.direction === 'in' ? 'bg-success/[0.08] text-success' : 'bg-danger/[0.08] text-danger'}`}>
                    {m.direction === 'in' ? <ArrowDownLeft size={12} strokeWidth={2} /> : <ArrowUpRight size={12} strokeWidth={2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.description || movementTypeLabel(m.movementType)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatShortDate(m.movementDate)}</p>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums shrink-0 ${m.direction === 'in' ? 'text-success' : 'text-danger'}`}>
                    {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-warning/[0.08] flex items-center justify-center">
                <Wallet size={16} className="text-warning" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">{minor?.name || 'Caja Menor'}</h2>
                <p className="text-xs text-muted-foreground">Balance inicial: {formatCurrency(minor?.openingBalance || 0)}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${minor?.status === 'open' ? 'bg-success/[0.08] text-success' : 'bg-muted text-muted-foreground'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${minor?.status === 'open' ? 'bg-success' : 'bg-muted-foreground'}`} />
              {minor?.status === 'open' ? 'Abierta' : 'Cerrada'}
            </span>
          </div>

          <p className="text-2xl font-bold tabular-nums tracking-tight mb-4">{formatCurrency(minor?.balance || 0)}</p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg bg-muted/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={12} className="text-success" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Ingresos</span>
              </div>
              <p className="text-sm font-semibold tabular-nums text-success">{formatCurrency(minorStats.income)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={12} className="text-danger" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Gastos</span>
              </div>
              <p className="text-sm font-semibold tabular-nums text-danger">{formatCurrency(minorStats.expenses)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Neto</span>
              <p className={`text-sm font-semibold tabular-nums ${minorStats.net >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(minorStats.net)}
              </p>
            </div>
          </div>

          {minorRecent.length > 0 && (
            <div className="space-y-0 divide-y divide-border mb-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5">Últimos movimientos</p>
              {minorRecent.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${m.direction === 'in' ? 'bg-success/[0.08] text-success' : 'bg-danger/[0.08] text-danger'}`}>
                    {m.direction === 'in' ? <ArrowDownLeft size={12} strokeWidth={2} /> : <ArrowUpRight size={12} strokeWidth={2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.description || movementTypeLabel(m.movementType)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatShortDate(m.movementDate)}</p>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums shrink-0 ${m.direction === 'in' ? 'text-success' : 'text-danger'}`}>
                    {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {minor && (
            <div className="border border-border rounded-lg p-3.5 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={14} className="text-warning" />
                <span className="text-xs font-semibold">Arqueo de caja</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Saldo sistema</span>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(minor.balance)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Efectivo contado</span>
                  <input
                    type="number"
                    value={physicalCount}
                    onChange={(e) => setPhysicalCount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="100"
                    className="w-full px-2 py-1 text-sm font-semibold tabular-nums rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Diferencia</span>
                  <p className={`text-sm font-bold tabular-nums ${minorDifference !== null
                    ? minorDifference === 0
                      ? 'text-success'
                      : 'text-danger'
                    : 'text-muted-foreground'
                  }`}>
                    {minorDifference !== null ? formatCurrency(minorDifference) : '—'}
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={arqueoNotes}
                onChange={(e) => setArqueoNotes(e.target.value)}
                placeholder="Notas del arqueo (opcional)"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card mb-2.5 focus:outline-none focus:ring-2 focus:ring-blue/20 transition-all placeholder:text-muted-foreground/50"
              />
              <button
                onClick={handleArqueo}
                disabled={isPending || !physicalCount}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Registrar arqueo
              </button>
            </div>
          )}

          {reconciliations.length > 0 && (
            <div className="mt-3 space-y-0 divide-y divide-border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5">Historial de arqueos</p>
              {reconciliations.filter(r => r.registerId === minor?.id).slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-xs font-medium">{formatDate(r.createdAt)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Sistema: {formatCurrency(r.systemBalance)} · Contado: {formatCurrency(r.physicalCount)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ${r.difference === 0 ? 'text-success' : 'text-danger'}`}>
                    {r.difference === 0 ? 'Cuadra' : formatCurrency(r.difference)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Movimientos recientes</h2>
          <span className="text-xs text-muted-foreground">{allMovements.length} registros</span>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {allMovements.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Wallet size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin movimientos registrados</p>
              <p className="text-xs text-muted-foreground mt-0.5">Haz clic en Registrar para agregar el primero</p>
            </div>
          ) : (
            allMovements.slice(0, 50).map((m) => {
              const registerLabel =
                general && m.sourceId === general.id
                  ? general.name
                  : minor && m.sourceId === minor.id
                    ? minor.name
                    : null
              return (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.direction === 'in' ? 'bg-success/[0.08] text-success' : 'bg-danger/[0.08] text-danger'}`}>
                    {m.direction === 'in' ? <ArrowDownLeft size={14} strokeWidth={1.8} /> : <ArrowUpRight size={14} strokeWidth={1.8} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.description || m.movementType}
                    </p>
                    <p className="text-xs text-muted-foreground truncate min-w-0">
                      <span className="font-mono text-[11px] text-muted-foreground/70 mr-1">{m.transactionId}</span>
                      {m.contact?.name && `· ${m.contact.name}`}
                      {registerLabel && <span className="ml-1 text-muted-foreground/60">· {registerLabel}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${m.direction === 'in' ? 'text-success' : 'text-danger'}`}>
                      {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(m.movementDate)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
