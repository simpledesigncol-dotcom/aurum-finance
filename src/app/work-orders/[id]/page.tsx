'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Wrench, ArrowDownLeft, ArrowUpRight, TrendingUp,
  CreditCard, Loader2, Save, X, Calendar,
  Car, User, FileText, ArrowLeftRight,
} from 'lucide-react'
import {
  formatCurrency, formatDateTime, formatDate, formatShortDate,
  movementTypeLabel, movementTypeColor, statusLabel, statusColor, cn,
} from '@/lib/utils'
import { WORK_ORDER_STATUSES } from '@/lib/constants'
import Modal from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'

type Movement = {
  id: string
  transactionId: string
  movementType: string
  amount: number
  direction: string
  movementDate: string
  status: string
  description: string | null
  contactId: string | null
  categoryId: string | null
  category: { id: string; name: string } | null
  contact: { id: string; name: string } | null
}

type Sale = {
  id: string
  total: number
  amountPaid: number
  status: string
  paymentType: string
  saleDate: string
  items: { id: string; serviceName: string; quantity: number; unitPrice: number; subtotal: number }[]
  payments: { id: string; amount: number; paymentDate: string }[]
}

type WorkOrderDetail = {
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
  updatedAt: string
  contact: { id: string; name: string; phone?: string; email?: string } | null
  financialMovements: Movement[]
  sales: Sale[]
  creator: { name: string; email: string } | null
  financials: {
    income: number
    costs: number
    profit: number
    margin: number
    pendingReceivable: number
  }
}

type Tab = 'movements' | 'payments' | 'detail'

export default function WorkOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params.id as string

  const [order, setOrder] = useState<WorkOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('movements')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    vehiclePlate: '',
    vehicleInfo: '',
    description: '',
    startDate: '',
    endDate: '',
    status: '',
  })

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-orders/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setOrder(data)
      setEditForm({
        vehiclePlate: data.vehiclePlate || '',
        vehicleInfo: data.vehicleInfo || '',
        description: data.description || '',
        startDate: data.startDate ? data.startDate.split('T')[0] : '',
        endDate: data.endDate ? data.endDate.split('T')[0] : '',
        status: data.status,
      })
    } catch {
      toast('error', 'Error al cargar la orden de trabajo')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed')
      toast('success', 'Orden de trabajo actualizada')
      setEditing(false)
      fetchOrder()
    } catch {
      toast('error', 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-28 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto animate-fade-in">
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Wrench size={20} className="text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium">Orden de trabajo no encontrada</p>
          <Link href="/work-orders" className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue hover:underline">
            <ArrowLeft size={14} />
            Volver a órdenes
          </Link>
        </div>
      </div>
    )
  }

  const { financials } = order

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/work-orders"
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft size={14} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">#{order.orderNumber}</h1>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusColor(order.status))}>
                {statusLabel(order.status)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {order.contact?.name || 'Sin cliente'}
              {order.vehiclePlate && <span className="text-muted-foreground/60"> · {order.vehiclePlate}</span>}
              {order.vehicleInfo && <span className="text-muted-foreground/60"> · {order.vehicleInfo}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150',
              editing ? 'bg-blue/[0.06] border-blue/20 text-blue' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {editing ? <X size={14} /> : <FileText size={14} />}
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <FinancialCard
          title="Ingresos"
          value={financials.income}
          icon={<ArrowDownLeft size={14} strokeWidth={1.8} />}
          variant="success"
        />
        <FinancialCard
          title="Costos"
          value={financials.costs}
          icon={<ArrowUpRight size={14} strokeWidth={1.8} />}
          variant="danger"
        />
        <FinancialCard
          title="Utilidad"
          value={financials.profit}
          icon={<TrendingUp size={14} strokeWidth={1.8} />}
          variant={financials.profit >= 0 ? 'success' : 'danger'}
        />
        <FinancialCard
          title="Por cobrar"
          value={financials.pendingReceivable}
          icon={<CreditCard size={14} strokeWidth={1.8} />}
          variant="warning"
          extra={financials.margin > 0 ? `${financials.margin.toFixed(1)}% margen` : undefined}
        />
      </div>

      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'movements' as Tab, label: 'Movimientos', count: order.financialMovements.length },
          { id: 'payments' as Tab, label: 'Pagos', count: order.sales.reduce((s, sale) => s + sale.payments.length, 0) },
          { id: 'detail' as Tab, label: 'Detalle' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 w-5 h-5 rounded-full bg-muted text-[10px] font-bold inline-flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'movements' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {order.financialMovements.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ArrowLeftRight size={20} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin movimientos registrados</p>
              <p className="text-xs text-muted-foreground mt-0.5">Los movimientos asociados aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {order.financialMovements.map(m => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', movementTypeColor(m.movementType))}>
                    {m.direction === 'in' ? <ArrowDownLeft size={14} strokeWidth={1.8} /> : <ArrowUpRight size={14} strokeWidth={1.8} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.description || movementTypeLabel(m.movementType)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {movementTypeLabel(m.movementType)}
                      {m.category && <span className="text-muted-foreground/60"> · {m.category.name}</span>}
                      {m.contact && <span className="text-muted-foreground/60"> · {m.contact.name}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-semibold tabular-nums', m.direction === 'in' ? 'text-success' : 'text-danger')}>
                      {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatShortDate(m.movementDate)}</p>
                  </div>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0', statusColor(m.status))}>
                    {statusLabel(m.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {order.sales.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CreditCard size={20} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin pagos registrados</p>
              <p className="text-xs text-muted-foreground mt-0.5">Los pagos de ventas asociadas aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {order.sales.map(sale => (
                <div key={sale.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">Venta</p>
                      <p className="text-xs text-muted-foreground">{formatDate(sale.saleDate)} · {sale.paymentType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(sale.total)}</p>
                      <p className="text-xs text-muted-foreground">Pagado: {formatCurrency(sale.amountPaid)}</p>
                    </div>
                  </div>
                  {sale.items.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {sale.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{item.serviceName} × {item.quantity}</span>
                          <span className="tabular-nums">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'detail' && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Placa</label>
                  <input
                    type="text"
                    value={editForm.vehiclePlate}
                    onChange={e => setEditForm(f => ({ ...f, vehiclePlate: e.target.value }))}
                    placeholder="ABC123"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Vehículo</label>
                  <input
                    type="text"
                    value={editForm.vehicleInfo}
                    onChange={e => setEditForm(f => ({ ...f, vehicleInfo: e.target.value }))}
                    placeholder="Marca, modelo, color..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Descripción</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Detalles del trabajo a realizar..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Estado</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                  >
                    {WORK_ORDER_STATUSES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Fecha inicio</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Fecha fin</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<Car size={14} />} label="Vehículo" value={order.vehicleInfo || '—'} />
              <InfoRow icon={<Wrench size={14} />} label="Placa" value={order.vehiclePlate || '—'} mono />
              <InfoRow icon={<User size={14} />} label="Cliente" value={order.contact?.name || '—'} />
              <InfoRow icon={<Calendar size={14} />} label="Inicio" value={order.startDate ? formatDate(order.startDate) : '—'} />
              <InfoRow icon={<Calendar size={14} />} label="Fin" value={order.endDate ? formatDate(order.endDate) : '—'} />
              <InfoRow icon={<FileText size={14} />} label="Creada" value={formatDateTime(order.createdAt)} />
              {order.description && (
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{order.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FinancialCard({
  title, value, icon, variant, extra,
}: {
  title: string; value: number; icon: React.ReactNode;
  variant: 'success' | 'danger' | 'warning'; extra?: string;
}) {
  const variants = {
    success: 'bg-success/[0.08] text-success',
    danger: 'bg-danger/[0.08] text-danger',
    warning: 'bg-warning/[0.08] text-warning',
  }
  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-200 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${variants[variant]}`}>{icon}</div>
      </div>
      <p className={cn('text-xl font-bold tabular-nums tracking-tight', variant === 'success' ? 'text-success' : variant === 'danger' ? 'text-danger' : 'text-warning')}>
        {formatCurrency(value)}
      </p>
      {extra && <p className="text-[11px] text-muted-foreground mt-0.5">{extra}</p>}
    </div>
  )
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={cn('text-sm font-medium', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  )
}
