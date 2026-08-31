'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Plus, ArrowLeftRight, ArrowDownLeft, ArrowUpRight,
  X, ArrowLeft, ArrowRight, FileText, Wrench, CreditCard,
  Wallet, Building2, Loader2, SlidersHorizontal, Pencil, Trash2,
} from 'lucide-react'
import { formatCurrency, formatShortDate, formatTime, formatDateTime, formatNumber,
  movementTypeLabel, movementTypeColor, statusLabel, statusColor, cn } from '@/lib/utils'
import { MOVEMENT_TYPES, PAYMENT_TYPES, MOVEMENT_STATUSES, QUICK_FILTERS } from '@/lib/constants'
import MovementForm from '@/components/movement-form'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'

type Movement = {
  id: string
  transactionId: string
  movementType: string
  amount: number
  direction: string
  movementDate: string
  status: string
  description: string | null
  sourceType: string
  sourceId: string
  contactId: string | null
  workOrderId: string | null
  categoryId: string | null
  referenceType: string | null
  referenceId: string | null
  receiptNumber: string | null
  notes: string | null
  metadata: string | null
  createdAt: string
  category: { id: string; name: string; type: string } | null
  contact: { id: string; name: string; type: string } | null
  workOrder?: { id: string; orderNumber: string } | null
  documents: { id: string; name: string; documentType: string }[]
}

type Pagination = {
  page: number
  limit: number
  total: number
  pages: number
}

const PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: '7days', label: '7 días' },
  { id: 'month', label: 'Este mes' },
  { id: '3months', label: '3 meses' },
]

const SOURCE_LABELS: Record<string, string> = {
  cash_register: 'Caja',
  bank_account: 'Banco',
}

const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_TYPES.map(pt => [pt.id, pt.label])
)

export default function MovementsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [movements, setMovements] = useState<Movement[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState(searchParams.get('period') || 'month')
  const [quickFilter, setQuickFilter] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null)
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Movement | null>(null)

  const [filters, setFilters] = useState({
    movementType: '',
    sourceType: '',
    paymentType: '',
    workOrderId: '',
    categoryId: '',
    contactId: '',
    dateFrom: '',
    dateTo: '',
    status: '',
  })

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== '').length
  }, [filters])

const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('limit', String(pagination.limit))
    params.set('page', String(pagination.page))

    if (filters.movementType) params.set('movementType', filters.movementType)
    if (filters.status) params.set('status', filters.status)
    if (filters.sourceType) params.set('sourceType', filters.sourceType)
    if (filters.workOrderId) params.set('workOrderId', filters.workOrderId)
    if (filters.categoryId) params.set('categoryId', filters.categoryId)
    if (filters.contactId) params.set('contactId', filters.contactId)
    if (filters.paymentType) params.set('paymentType', filters.paymentType)

    if (period) {
      const now = new Date()
      let start: Date
      switch (period) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          params.set('dateFrom', start.toISOString())
          params.set('dateTo', new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString())
          break
        case '7days':
          start = new Date(now)
          start.setDate(now.getDate() - 6)
          start.setHours(0, 0, 0, 0)
          params.set('dateFrom', start.toISOString())
          break
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          params.set('dateFrom', start.toISOString())
          break
        case '3months':
          start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          params.set('dateFrom', start.toISOString())
          break
      }
    }

    if (quickFilter) params.set('quickFilter', quickFilter)

    if (search) params.set('search', search)

    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)

    return params.toString()
  }, [pagination.page, pagination.limit, filters, period, quickFilter, search])

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const query = buildQueryParams()
      const res = await fetch(`/api/movements?${query}`)
      if (!res.ok) throw new Error('Error fetching')
      const data = await res.json()
      setMovements(data.movements || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total ?? 0,
        pages: data.pagination?.totalPages ?? 1,
      }))
    } catch {
      setMovements([])
    } finally {
      setLoading(false)
    }
  }, [buildQueryParams])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  const handlePeriodChange = (p: string) => {
    setPeriod(p)
    setQuickFilter(null)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleQuickFilter = (id: string) => {
    setQuickFilter(prev => prev === id ? null : id)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ movementType: '', sourceType: '', paymentType: '', workOrderId: '', categoryId: '', contactId: '', dateFrom: '', dateTo: '', status: '' })
    setQuickFilter(null)
    setSearch('')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const totalPages = pagination.pages || 1

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Centro financiero del negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-[3px]">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => handlePeriodChange(p.id)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
                  period === p.id
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
            Nuevo
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
placeholder="Buscar movimientos..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 placeholder:text-muted-foreground/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150',
            showAdvanced || activeFilterCount > 0
              ? 'bg-blue/[0.06] border-blue/20 text-blue'
              : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-blue text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {QUICK_FILTERS.map(qf => (
          <button
            key={qf.id}
            onClick={() => handleQuickFilter(qf.id)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150',
              quickFilter === qf.id
                ? 'bg-blue/[0.08] border-blue/20 text-blue'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {qf.label}
          </button>
        ))}
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="px-2.5 py-1 rounded-full text-xs font-medium text-danger hover:bg-danger/[0.06] transition-colors">
            Limpiar filtros
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="bg-card rounded-xl border border-border p-4 animate-slide-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Tipo</label>
              <select
                value={filters.movementType}
                onChange={e => setFilters(f => ({ ...f, movementType: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all"
              >
                <option value="">Todos</option>
                {MOVEMENT_TYPES.map(mt => (
                  <option key={mt.id} value={mt.id}>{mt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Cuenta</label>
              <select
                value={filters.sourceType}
                onChange={e => setFilters(f => ({ ...f, sourceType: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all"
              >
                <option value="">Todas</option>
                <option value="cash_register">Caja</option>
                <option value="bank_account">Banco</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Medio de pago</label>
              <select
                value={filters.paymentType}
                onChange={e => setFilters(f => ({ ...f, paymentType: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all"
              >
                <option value="">Todos</option>
                {PAYMENT_TYPES.map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Estado</label>
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all"
              >
                <option value="">Todos</option>
                {MOVEMENT_STATUSES.map(ms => (
                  <option key={ms.id} value={ms.id}>{ms.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">OT</label>
              <input
                type="text"
                value={filters.workOrderId}
                onChange={e => setFilters(f => ({ ...f, workOrderId: e.target.value }))}
                placeholder="Buscar por OT..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Categoría</label>
              <input
                type="text"
                value={filters.categoryId}
                onChange={e => setFilters(f => ({ ...f, categoryId: e.target.value }))}
                placeholder="Buscar por categoría..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Persona</label>
              <input
                type="text"
                value={filters.contactId}
                onChange={e => setFilters(f => ({ ...f, contactId: e.target.value }))}
                placeholder="Buscar por persona..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all"
              />
            </div>
          </div>
        </div>
      )}

<div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Movimientos</h2>
          <span className="text-xs text-muted-foreground">{formatNumber(pagination.total)} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Fecha</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Movimiento</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden lg:table-cell">OT</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden md:table-cell">Categoría</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Cuenta</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Medio</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Valor</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3"><div className="h-3.5 w-20 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3"><div className="h-3.5 w-32 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><div className="h-3.5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><div className="h-3.5 w-20 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><div className="h-3.5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3 hidden sm:table-cell"><div className="h-3.5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3"><div className="h-3.5 w-24 bg-muted rounded animate-pulse ml-auto" /></td>
                    <td className="px-5 py-3 hidden sm:table-cell"><div className="h-3.5 w-16 bg-muted rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <ArrowLeftRight size={20} className="text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium">No hay movimientos todavía</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Registra tu primer movimiento para comenzar</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Plus size={14} />
                      Nuevo movimiento
                    </button>
                  </td>
                </tr>
              ) : (
                movements.map(m => {
                  const typeColors = movementTypeColor(m.movementType)
                  const stColors = statusColor(m.status)
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMovement(m)}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors duration-150 cursor-pointer"
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="text-sm font-medium">{formatShortDate(m.movementDate)}</p>
                        <p className="text-[11px] text-muted-foreground">{formatTime(m.movementDate)}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', typeColors)}>
                            {m.direction === 'in' ? <ArrowDownLeft size={13} strokeWidth={1.8} /> : <ArrowUpRight size={13} strokeWidth={1.8} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]">{m.description || movementTypeLabel(m.movementType)}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {movementTypeLabel(m.movementType)}
                              {m.contact && <span className="text-muted-foreground/60"> · {m.contact.name}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {m.workOrderId ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue font-medium bg-blue/[0.06] px-2 py-0.5 rounded-full">
                            <Wrench size={11} />
                            {m.workOrderId.slice(0, 8)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground truncate block max-w-[120px]">
                          {m.category?.name || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {m.sourceType === 'bank_account' ? (
                            <Building2 size={12} className="text-muted-foreground/60" />
                          ) : (
                            <Wallet size={12} className="text-muted-foreground/60" />
                          )}
                          <span className="text-sm text-muted-foreground">{SOURCE_LABELS[m.sourceType] || m.sourceType}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            try {
                              const meta = m.metadata ? JSON.parse(m.metadata) : null
                              return PAYMENT_LABELS[meta?.paymentType] || '—'
                            } catch { return '—' }
                          })()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <p className={cn('text-sm font-semibold tabular-nums', m.direction === 'in' ? 'text-success' : 'text-danger')}>
                          {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap hidden sm:table-cell">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', stColors)}>
                          {statusLabel(m.status)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && movements.length > 0 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {formatNumber(pagination.total)} movimientos
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={14} />
              </button>
              <span className="text-xs font-medium text-muted-foreground px-2">
                {pagination.page} / {totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
                disabled={pagination.page >= totalPages}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <MovementForm onClose={() => { setShowForm(false); fetchMovements() }} />
      )}

      {selectedMovement && (
        <MovementDetail
          movement={selectedMovement}
          onClose={() => setSelectedMovement(null)}
          onEdit={() => {
            setEditingMovement(selectedMovement)
            setSelectedMovement(null)
          }}
onDelete={async () => {
            setDeleteConfirm(selectedMovement)
          }}
        />
      )}

{editingMovement && (
        <MovementEditForm
          movement={editingMovement}
          onClose={() => setEditingMovement(null)}
          onSaved={() => {
            setEditingMovement(null)
            fetchMovements()
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="Eliminar movimiento"
          message={`¿Seguro que deseas eliminar este movimiento por ${formatCurrency(deleteConfirm.amount)}? Esta acción no se puede deshacer.`}
          onConfirm={async () => {
            await fetch(`/api/movements?id=${deleteConfirm.id}`, { method: 'DELETE' })
            setDeleteConfirm(null)
            setSelectedMovement(null)
            fetchMovements()
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}

function MovementDetail({ movement, onClose, onEdit, onDelete }: { movement: Movement; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details')

  return (
    <Modal title="Detalle del movimiento" subtitle={movement.transactionId} onClose={onClose} wide>
      <div className="p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', movementTypeColor(movement.movementType))}>
            {movement.direction === 'in' ? <ArrowDownLeft size={18} strokeWidth={1.8} /> : <ArrowUpRight size={18} strokeWidth={1.8} />}
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold">{movement.description || movementTypeLabel(movement.movementType)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{movementTypeLabel(movement.movementType)} · {formatDateTime(movement.movementDate)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onEdit}
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-blue transition-colors" title="Editar">
              <Pencil size={15} />
            </button>
            <button onClick={onDelete}
              className="w-8 h-8 rounded-lg hover:bg-danger/10 flex items-center justify-center text-muted-foreground hover:text-danger transition-colors" title="Eliminar">
              <Trash2 size={15} />
            </button>
          </div>
          <p className={cn('text-xl font-bold tabular-nums', movement.direction === 'in' ? 'text-success' : 'text-danger')}>
            {movement.direction === 'in' ? '+' : '-'}{formatCurrency(movement.amount)}
          </p>
        </div>

        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
              activeTab === 'details' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Detalles
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
              activeTab === 'notes' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Notas
          </button>
        </div>

        {activeTab === 'details' && (
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="ID Transacción" value={movement.transactionId} mono />
            <DetailRow label="Estado">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusColor(movement.status))}>
                {statusLabel(movement.status)}
              </span>
            </DetailRow>
            <DetailRow label="Tipo">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', movementTypeColor(movement.movementType))}>
                {movementTypeLabel(movement.movementType)}
              </span>
            </DetailRow>
            <DetailRow label="Dirección">
              <span className={cn('text-xs font-medium', movement.direction === 'in' ? 'text-success' : 'text-danger')}>
                {movement.direction === 'in' ? 'Entrada' : 'Salida'}
              </span>
            </DetailRow>
            <DetailRow label="Fecha" value={formatDateTime(movement.movementDate)} />
            <DetailRow label="Monto" value={formatCurrency(movement.amount)} />
            <DetailRow label="Cuenta" value={SOURCE_LABELS[movement.sourceType] || movement.sourceType} />
            <DetailRow label="Categoría" value={movement.category?.name || '—'} />
            <DetailRow label="Contacto" value={movement.contact?.name || '—'} />
            <DetailRow label="OT" value={movement.workOrderId || '—'} />
            <DetailRow label="Referencia" value={movement.referenceType || '—'} />
            <DetailRow label="Recibo" value={movement.receiptNumber || '—'} />
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            {movement.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{movement.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">Sin notas</p>
            )}
            {movement.documents.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Documentos adjuntos</p>
                <div className="space-y-1.5">
                  {movement.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText size={13} className="text-muted-foreground/60" />
                      {doc.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function DetailRow({
  label,
  value,
  mono,
  children,
}: {
  label: string
  value?: string
  mono?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {children || (
        <p className={cn('text-sm font-medium mt-0.5', mono && 'font-mono text-[11px]')}>{value}</p>
      )}
    </div>
  )
}

function MovementEditForm({ movement, onClose, onSaved }: {
  movement: Movement
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(String(movement.amount))
  const [description, setDescription] = useState(movement.description || '')
  const [notes, setNotes] = useState(movement.notes || '')
  const [movementDate, setMovementDate] = useState(movement.movementDate?.slice(0, 10) || new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState(movement.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sourceType, setSourceType] = useState(movement.sourceType || 'cash_register')
  const [sourceId, setSourceId] = useState(movement.sourceId || '')
  const [bankAccounts, setBankAccounts] = useState<{ id: string; bankName: string }[]>([])
  const [registers, setRegisters] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/bank-accounts')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setBankAccounts(d)
      })
      .catch(() => {})
    fetch('/api/cash-register/default')
      .then(r => r.json())
      .then(d => {
        const list: { id: string; name: string }[] = []
        if (d?.general) list.push({ id: d.general.id, name: d.general.name })
        if (d?.minor) list.push({ id: d.minor.id, name: d.minor.name })
        setRegisters(list)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sourceType === 'bank_account' && !sourceId) {
      setError('Selecciona una cuenta bancaria')
      return
    }
    if (sourceType === 'cash_register' && !sourceId) {
      setError('No hay una caja disponible para asignar')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/movements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: movement.id,
          amount,
          description,
          notes,
          movementDate,
          status,
          sourceType,
          sourceId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Editar movimiento" subtitle={movement.transactionId} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cuenta (origen)</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setSourceType('cash_register'); setSourceId(registers[0]?.id || '') }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${sourceType === 'cash_register' ? 'border-blue/40 bg-blue/[0.06] text-blue' : 'border-border hover:bg-muted text-muted-foreground'}`}>
              <Wallet size={13} /> Caja
            </button>
            <button type="button" onClick={() => { setSourceType('bank_account'); setSourceId('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${sourceType === 'bank_account' ? 'border-blue/40 bg-blue/[0.06] text-blue' : 'border-border hover:bg-muted text-muted-foreground'}`}>
              <Building2 size={13} /> Banco
            </button>
          </div>
          {sourceType === 'cash_register' && registers.length > 0 && (
            <select value={sourceId} onChange={e => setSourceId(e.target.value)}
              className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40">
              {registers.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
          {sourceType === 'bank_account' && (
            <select value={sourceId} onChange={e => setSourceId(e.target.value)}
              className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40">
              <option value="">Seleccionar cuenta</option>
              {bankAccounts.map(ba => (
                <option key={ba.id} value={ba.id}>{ba.bankName}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Monto</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fecha</label>
            <input
              type="date"
              value={movementDate}
              onChange={e => setMovementDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Estado</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40"
          >
            <option value="confirmed">Confirmado</option>
            <option value="pending">Pendiente</option>
            <option value="draft">Borrador</option>
            <option value="cancelled">Anulado</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notas</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
