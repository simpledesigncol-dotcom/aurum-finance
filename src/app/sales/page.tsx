'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Plus, Pencil, Trash2, ArrowDownLeft, X } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SaleItem {
  serviceName: string
  quantity: number
  unitPrice: number
}

interface Sale {
  id: string
  saleDate: string
  status: string
  paymentType: string
  subtotal: number
  discount: number
  tax: number
  total: number
  amountPaid: number
  balanceDue: number
  notes: string | null
  contact: { id: string; name: string } | null
  items: { id: string; serviceName: string; quantity: number; unitPrice: number; subtotal: number }[]
  payments: { id: string; amount: number }[]
}

interface Stats {
  total: number
  count: number
  pendingAmount: number
}

const emptyItems: SaleItem[] = [{ serviceName: '', quantity: 1, unitPrice: 0 }]

const emptyForm = {
  saleDate: new Date().toISOString().split('T')[0],
  contactName: '',
  paymentType: 'cash',
  items: emptyItems,
  discount: '',
  tax: '',
  notes: '',
}

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'tc', label: 'Tarjeta Credito' },
  { value: 'td', label: 'Tarjeta Debito' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit', label: 'Credito' },
]

function getStatusBadge(status: string, balanceDue: number) {
  if (status === 'cancelled') return { className: 'bg-muted text-muted-foreground', label: 'Cancelada' }
  if (balanceDue <= 0) return { className: 'bg-success/[0.08] text-success', label: 'Completada' }
  if (balanceDue < 1) return { className: 'bg-warning/[0.08] text-warning', label: 'Parcial' }
  return { className: 'bg-warning/[0.08] text-warning', label: 'Pendiente' }
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, count: 0, pendingAmount: 0 })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null)

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch('/api/sales')
      const data = await res.json()
      setSales(data.sales || [])
      setStats(data.stats || { total: 0, count: 0, pendingAmount: 0 })
    } catch {
      console.error('Error fetching sales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSales() }, [fetchSales])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, items: [{ serviceName: '', quantity: 1, unitPrice: 0 }] })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (sale: Sale) => {
    setEditing(sale)
    setForm({
      saleDate: sale.saleDate.split('T')[0],
      contactName: sale.contact?.name || '',
      paymentType: sale.paymentType,
      items: sale.items.length > 0
        ? sale.items.map(i => ({ serviceName: i.serviceName, quantity: i.quantity, unitPrice: i.unitPrice }))
        : [{ serviceName: '', quantity: 1, unitPrice: 0 }],
      discount: sale.discount ? String(sale.discount) : '',
      tax: sale.tax ? String(sale.tax) : '',
      notes: sale.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.saleDate || form.items.every(i => !i.serviceName.trim())) return
    setFormError('')
    setSaving(true)

    const validItems = form.items.filter(i => i.serviceName.trim() && i.unitPrice > 0)
    const payload = {
      saleDate: form.saleDate,
      paymentType: form.paymentType,
      contactName: form.contactName || null,
      items: validItems,
      discount: form.discount ? Number(form.discount) : 0,
      tax: form.tax ? Number(form.tax) : 0,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        const res = await fetch(`/api/sales/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentType: payload.paymentType, discount: payload.discount, tax: payload.tax, notes: payload.notes }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
      } else {
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
      }
      setModalOpen(false)
      fetchSales()
    } catch {
      setFormError('Error de conexion. Intente de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/sales/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchSales()
    } catch {
      console.error('Error deleting sale')
    }
  }

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const items = [...form.items]
    items[index] = { ...items[index], [field]: field === 'serviceName' ? value : Number(value) || 0 }
    setForm({ ...form, items })
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { serviceName: '', quantity: 1, unitPrice: 0 }] })
  const removeItem = (index: number) => {
    if (form.items.length <= 1) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Registro de servicios y ventas</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 bg-blue text-white text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-blue/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nueva venta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total ventas</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pendiente cobro</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-warning">{formatCurrency(stats.pendingAmount)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registros</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{stats.count}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Historial de ventas</h2>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin ventas registradas</p>
              <p className="text-xs text-muted-foreground mt-1">Crea tu primera venta para comenzar</p>
              <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
                Nueva venta
              </button>
            </div>
          ) : (
            sales.map((sale) => {
              const badge = getStatusBadge(sale.status, sale.balanceDue)
              return (
                <div key={sale.id} className="px-5 py-3 flex items-center gap-3 flex-wrap hover:bg-muted/40 transition-colors duration-150">
                  <div className="w-8 h-8 rounded-lg bg-success/[0.08] text-success flex items-center justify-center shrink-0">
                    <ArrowDownLeft size={14} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sale.contact?.name || 'Venta directa'}
                    </p>
                    <p className="text-xs text-muted-foreground min-w-0 truncate">
                      {sale.items.length} servicio{sale.items.length !== 1 ? 's' : ''} · {sale.paymentType}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/[0.08] text-success">
                        +{formatCurrency(sale.total)}
                      </span>
                      {sale.amountPaid > 0 && sale.amountPaid < sale.total && (
                        <span className="text-xs text-muted-foreground">
                          Pagado {formatCurrency(sale.amountPaid)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(sale.saleDate)}</p>
                  </div>
                  <div className="text-right shrink-0 sm:hidden">
                    <p className="text-sm font-semibold tabular-nums text-success">
                      +{formatCurrency(sale.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(sale.saleDate)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(sale)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(sale)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Editar venta' : 'Nueva venta'}
          subtitle={editing ? 'Actualizar datos de la venta' : 'Registrar una nueva venta'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fecha *</label>
                <input
                  type="date"
                  required
                  value={form.saleDate}
                  onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Contacto</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre del contacto"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo de pago *</label>
              <select
                required
                value={form.paymentType}
                onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
                className={inputClass}
              >
                {PAYMENT_TYPES.map(pt => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Servicios / Items</label>
                <button type="button" onClick={addItem} className="text-xs text-blue font-medium hover:underline flex items-center gap-1">
                  <Plus size={12} /> Agregar
                </button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      type="text"
                      value={item.serviceName}
                      onChange={(e) => updateItem(idx, 'serviceName', e.target.value)}
                      className={inputClass}
                      placeholder="Nombre del servicio"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className={inputClass}
                      placeholder="Cant."
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                      className={inputClass}
                      placeholder="Precio"
                    />
                  </div>
                  <div className="text-xs font-medium tabular-nums text-muted-foreground pt-2.5 w-24 text-right shrink-0">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="w-8 h-8 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors shrink-0 mt-0.5">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {form.items.length > 0 && (
                <div className="flex justify-end pt-1 border-t border-border">
                  <span className="text-xs font-medium text-muted-foreground">
                    Subtotal: <span className="text-sm font-bold text-foreground tabular-nums">
                      {formatCurrency(form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Descuento</label>
                <input
                  type="number"
                  min="0"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Impuesto</label>
                <input
                  type="number"
                  min="0"
                  value={form.tax}
                  onChange={(e) => setForm({ ...form, tax: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass + ' min-h-[64px] resize-none'}
                placeholder="Notas adicionales..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              {formError && (<p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>)}
              <button
                type="submit"
                disabled={saving || form.items.every(i => !i.serviceName.trim())}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue text-white hover:bg-blue/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar venta"
          message={`¿Seguro que deseas eliminar esta venta de ${formatCurrency(deleteTarget.total)}? Esta accion no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
