'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Pencil, Trash2, ArrowUpRight, X } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PurchaseItem {
  itemName: string
  quantity: number
  unitPrice: number
}

interface Purchase {
  id: string
  purchaseDate: string
  invoiceNumber: string | null
  purchaseType: string
  paymentType: string
  subtotal: number
  tax: number
  total: number
  amountPaid: number
  balanceDue: number
  status: string
  notes: string | null
  contact: { id: string; name: string } | null
  items: { id: string; itemName: string; quantity: number; unitPrice: number; subtotal: number }[]
  payments: { id: string; amount: number }[]
}

const emptyItems: PurchaseItem[] = [{ itemName: '', quantity: 1, unitPrice: 0 }]

const emptyForm = {
  purchaseDate: new Date().toISOString().split('T')[0],
  purchaseType: 'product',
  invoiceNumber: '',
  paymentType: 'cash',
  items: emptyItems,
  tax: '',
  notes: '',
}

const PURCHASE_TYPES = [
  { value: 'product', label: 'Producto' },
  { value: 'service', label: 'Servicio' },
  { value: 'asset', label: 'Activo' },
]

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
  return { className: 'bg-warning/[0.08] text-warning', label: 'Pendiente' }
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Purchase | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null)

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await fetch('/api/purchases')
      const data = await res.json()
      setPurchases(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching purchases')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPurchases() }, [fetchPurchases])

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0)
  const pendingBalance = purchases.reduce((sum, p) => sum + p.balanceDue, 0)

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, items: [{ itemName: '', quantity: 1, unitPrice: 0 }] })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (purchase: Purchase) => {
    setEditing(purchase)
    setForm({
      purchaseDate: purchase.purchaseDate.split('T')[0],
      purchaseType: purchase.purchaseType,
      invoiceNumber: purchase.invoiceNumber || '',
      paymentType: purchase.paymentType,
      items: purchase.items.length > 0
        ? purchase.items.map(i => ({ itemName: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice }))
        : [{ itemName: '', quantity: 1, unitPrice: 0 }],
      tax: purchase.tax ? String(purchase.tax) : '',
      notes: purchase.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.purchaseDate || !form.purchaseType || form.items.every(i => !i.itemName.trim())) return
    setFormError('')
    setSaving(true)

    const validItems = form.items.filter(i => i.itemName.trim() && i.unitPrice > 0)
    const payload = {
      purchaseDate: form.purchaseDate,
      purchaseType: form.purchaseType,
      paymentType: form.paymentType,
      invoiceNumber: form.invoiceNumber || null,
      items: validItems,
      tax: form.tax ? Number(form.tax) : 0,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        const res = await fetch(`/api/purchases/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchaseType: payload.purchaseType, paymentType: payload.paymentType, invoiceNumber: payload.invoiceNumber, tax: payload.tax, notes: payload.notes }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
      } else {
        const res = await fetch('/api/purchases', {
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
      fetchPurchases()
    } catch {
      setFormError('Error de conexion. Intente de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/purchases/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchPurchases()
    } catch {
      console.error('Error deleting purchase')
    }
  }

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const items = [...form.items]
    items[index] = { ...items[index], [field]: field === 'itemName' ? value : Number(value) || 0 }
    setForm({ ...form, items })
  }

  const addItem = () => setForm({ ...form, items: [...form.items, { itemName: '', quantity: 1, unitPrice: 0 }] })
  const removeItem = (index: number) => {
    if (form.items.length <= 1) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Registro de compras e insumos</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 bg-blue text-white text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-blue/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nueva compra
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total compras</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-danger">{formatCurrency(totalPurchases)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pendiente pago</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-warning">{formatCurrency(pendingBalance)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registros</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{purchases.length}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Historial de compras</h2>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Package size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin compras registradas</p>
              <p className="text-xs text-muted-foreground mt-1">Registra tu primera compra para comenzar</p>
              <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
                Nueva compra
              </button>
            </div>
          ) : (
            purchases.map((purchase) => {
              const badge = getStatusBadge(purchase.status, purchase.balanceDue)
              return (
                <div key={purchase.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                  <div className="w-8 h-8 rounded-lg bg-danger/[0.08] text-danger flex items-center justify-center shrink-0">
                    <ArrowUpRight size={14} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {purchase.contact?.name || purchase.invoiceNumber || 'Compra'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {purchase.items.length} articulo{purchase.items.length !== 1 ? 's' : ''} · {purchase.purchaseType}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-semibold tabular-nums text-danger">
                      -{formatCurrency(purchase.total)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(purchase.purchaseDate)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(purchase)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(purchase)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
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
          title={editing ? 'Editar compra' : 'Nueva compra'}
          subtitle={editing ? 'Actualizar datos de la compra' : 'Registrar una nueva compra'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fecha *</label>
                <input
                  type="date"
                  required
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de compra *</label>
                <select
                  required
                  value={form.purchaseType}
                  onChange={(e) => setForm({ ...form, purchaseType: e.target.value })}
                  className={inputClass}
                >
                  {PURCHASE_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">No. Factura</label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Numero de factura"
                />
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Items</label>
                <button type="button" onClick={addItem} className="text-xs text-blue font-medium hover:underline flex items-center gap-1">
                  <Plus size={12} /> Agregar
                </button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                      className={inputClass}
                      placeholder="Nombre del item"
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
                disabled={saving || !form.purchaseDate || form.items.every(i => !i.itemName.trim())}
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
          title="Eliminar compra"
          message={`¿Seguro que deseas eliminar esta compra de ${formatCurrency(deleteTarget.total)}? Esta accion no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
