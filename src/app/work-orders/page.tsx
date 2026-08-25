'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Search, X, Wrench, ArrowDownLeft, ArrowUpRight,
  TrendingUp, ChevronRight,
} from 'lucide-react'
import { formatCurrency, statusLabel, statusColor, cn } from '@/lib/utils'
import { WORK_ORDER_STATUSES } from '@/lib/constants'

type WorkOrder = {
  id: string
  orderNumber: string
  contactId: string | null
  vehiclePlate: string | null
  vehicleInfo: string | null
  description: string | null
  status: string
  saleAmount: number
  costAmount: number
  startDate: string | null
  endDate: string | null
  createdAt: string
  contact: { id: string; name: string } | null
  _count: { financialMovements: number }
}

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '100')
      const res = await fetch(`/api/work-orders?${params.toString()}`)
      if (!res.ok) throw new Error('Error')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filtered = orders.filter(o => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      o.orderNumber.toLowerCase().includes(s) ||
      o.contact?.name?.toLowerCase().includes(s) ||
      o.vehiclePlate?.toLowerCase().includes(s) ||
      o.vehicleInfo?.toLowerCase().includes(s) ||
      o.description?.toLowerCase().includes(s)
    )
  })

  const summary = orders.reduce(
    (acc, o) => {
      acc.total++
      if (o.status === 'open') acc.open++
      if (o.status === 'in_progress') acc.inProgress++
      if (o.status === 'completed') acc.completed++
      acc.income += o.saleAmount
      acc.costs += o.costAmount
      return acc
    },
    { total: 0, open: 0, inProgress: 0, completed: 0, income: 0, costs: 0 }
  )

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestión y seguimiento de OTs</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Nueva OT
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <SummaryCard
          title="Total abiertas"
          value={summary.open}
          icon={<Wrench size={14} strokeWidth={1.8} />}
          variant="blue"
        />
        <SummaryCard
          title="En proceso"
          value={summary.inProgress}
          icon={<TrendingUp size={14} strokeWidth={1.8} />}
          variant="warning"
        />
        <SummaryCard
          title="Ingresos totales"
          value={summary.income}
          icon={<ArrowDownLeft size={14} strokeWidth={1.8} />}
          variant="success"
          isCurrency
        />
        <SummaryCard
          title="Costos totales"
          value={summary.costs}
          icon={<ArrowUpRight size={14} strokeWidth={1.8} />}
          variant="danger"
          isCurrency
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por #OT, cliente, placa..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 placeholder:text-muted-foreground/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center bg-muted rounded-lg p-[3px]">
          <button
            onClick={() => setStatusFilter(null)}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
              !statusFilter
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Todas
          </button>
          {WORK_ORDER_STATUSES.slice(0, 4).map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id === statusFilter ? null : s.id)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
                statusFilter === s.id
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">#OT</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Cliente</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden md:table-cell">Vehículo</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Ingresos</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Costos</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Utilidad</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Margen</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3"><div className="h-3.5 w-16 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3"><div className="h-3.5 w-28 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><div className="h-3.5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-5 py-3"><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /></td>
                    <td className="px-5 py-3"><div className="h-3.5 w-24 bg-muted rounded animate-pulse ml-auto" /></td>
                    <td className="px-5 py-3 hidden sm:table-cell"><div className="h-3.5 w-24 bg-muted rounded animate-pulse ml-auto" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><div className="h-3.5 w-24 bg-muted rounded animate-pulse ml-auto" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><div className="h-3.5 w-12 bg-muted rounded animate-pulse ml-auto" /></td>
                    <td className="px-5 py-3" />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Wrench size={20} className="text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-medium">No hay órdenes de trabajo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Crea una nueva OT para comenzar</p>
                  </td>
                </tr>
              ) : (
                filtered.map(order => {
                  const profit = order.saleAmount - order.costAmount
                  const margin = order.saleAmount > 0 ? (profit / order.saleAmount) * 100 : 0
                  return (
                    <Link
                      key={order.id}
                      href={`/work-orders/${order.id}`}
                      className="block border-b border-border last:border-0 hover:bg-muted/40 transition-colors duration-150"
                    >
                      <div className="px-5 py-3 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue">#{order.orderNumber}</span>
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', statusColor(order.status))}>
                              {statusLabel(order.status)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {order.contact?.name || 'Sin cliente'}
                            {order.vehiclePlate && <span className="text-muted-foreground/60"> · {order.vehiclePlate}</span>}
                          </p>
                        </div>
                        <div className="hidden md:block text-xs text-muted-foreground truncate max-w-[180px]">
                          {order.vehicleInfo || '—'}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-success">{formatCurrency(order.saleAmount)}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium tabular-nums text-danger">{formatCurrency(order.costAmount)}</p>
                        </div>
                        <div className="text-right hidden lg:block">
                          <p className={cn('text-sm font-semibold tabular-nums', profit >= 0 ? 'text-success' : 'text-danger')}>
                            {formatCurrency(profit)}
                          </p>
                        </div>
                        <div className="text-right hidden lg:block">
                          <span className={cn('text-xs font-semibold tabular-nums', margin >= 30 ? 'text-success' : margin >= 0 ? 'text-warning' : 'text-danger')}>
                            {margin.toFixed(0)}%
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground/40 shrink-0" />
                      </div>
                    </Link>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  variant,
  isCurrency,
}: {
  title: string
  value: number
  icon: React.ReactNode
  variant: 'blue' | 'warning' | 'success' | 'danger'
  isCurrency?: boolean
}) {
  const variants = {
    blue: 'bg-blue/[0.08] text-blue',
    warning: 'bg-warning/[0.08] text-warning',
    success: 'bg-success/[0.08] text-success',
    danger: 'bg-danger/[0.08] text-danger',
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-200 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${variants[variant]}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold tabular-nums tracking-tight">
        {isCurrency ? formatCurrency(value) : value}
      </p>
    </div>
  )
}
