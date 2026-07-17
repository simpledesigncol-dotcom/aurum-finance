'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowDownLeft, Plus, Pencil, Trash2, CircleDollarSign } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface AR {
  id: string
  description: string
  contactId: string
  originalAmount: number
  paidAmount: number
  balance: number
  issueDate: string
  dueDate: string
  status: string
  notes: string | null
  contact: { id: string; name: string } | null
  payments: unknown[]
}

const STATUS_BADGE: Record<string, string> = {
  paid: 'bg-success/[0.08] text-success',
  partial: 'bg-warning/[0.08] text-warning',
  pending: 'bg-muted text-muted-foreground',
  overdue: 'bg-danger/[0.08] text-danger',
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagada',
  partial: 'Parcial',
  pending: 'Pendiente',
}

const emptyForm = {
  contactName: '',
  description: '',
  originalAmount: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
}

const emptyPayment = {
  amount: '',
  paymentDate: new Date().toISOString().split('T')[0],
}

function isOverdue(ar: AR): boolean {
  return ar.status !== 'paid' && new Date(ar.dueDate) < new Date()
}

function getDisplayStatus(ar: AR): string {
  if (isOverdue(ar)) return 'overdue'
  return ar.status
}

export default function ReceivablesPage() {
  const [accounts, setAccounts] = useState<AR[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AR | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AR | null>(null)
  const [paymentModal, setPaymentModal] = useState<AR | null>(null)
  const [paymentForm, setPaymentForm] = useState(emptyPayment)
  const [paying, setPaying] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts-receivable')
      const data = await res.json()
      setAccounts(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching AR')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const totalPending = accounts.filter((a) => a.status !== 'paid').reduce((s, a) => s + a.balance, 0)
  const overdueCount = accounts.filter(isOverdue).length
  const totalAR = accounts.reduce((s, a) => s + a.originalAmount, 0)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (ar: AR) => {
    setEditing(ar)
    setForm({
      contactName: ar.contact?.name || '',
      description: ar.description,
      originalAmount: String(ar.originalAmount),
      issueDate: ar.issueDate.split('T')[0],
      dueDate: ar.dueDate.split('T')[0],
      notes: ar.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const findOrCreateContact = async (name: string): Promise<string | null> => {
    if (!name.trim()) return null
    const res = await fetch('/api/contacts')
    const contacts = await res.json()
    const existing = contacts.find((c: { name: string }) => c.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing.id
    const createRes = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'customer' }),
    })
    const created = await createRes.json()
    return created.id
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contactName.trim() || !form.description.trim() || !form.originalAmount || !form.issueDate || !form.dueDate) return
    setFormError('')
    setSaving(true)

    try {
      const contactId = await findOrCreateContact(form.contactName)
      const payload = {
        contactId,
        description: form.description,
        originalAmount: parseFloat(form.originalAmount),
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        notes: form.notes || null,
      }

      if (editing) {
        const res = await fetch(`/api/accounts-receivable/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, balance: parseFloat(form.originalAmount) }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
      } else {
        const res = await fetch('/api/accounts-receivable', {
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
      fetchAccounts()
    } catch {
      setFormError('Error de conexion. Intente de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/accounts-receivable/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchAccounts()
    } catch {
      console.error('Error deleting AR')
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModal || !paymentForm.amount) return
    setPaying(true)

    try {
      await fetch(`/api/accounts-receivable/${paymentModal.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
        }),
      })
      setPaymentModal(null)
      setPaymentForm(emptyPayment)
      fetchAccounts()
    } catch {
      console.error('Error recording payment')
    } finally {
      setPaying(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cuentas por Cobrar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Dinero que te deben los clientes</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nuevo cobro
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total pendiente</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-warning">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencidas</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-danger">{overdueCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total cuentas</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{formatCurrency(totalAR)}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Cuentas por cobrar</h2>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ArrowDownLeft size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin cuentas por cobrar</p>
              <p className="text-xs text-muted-foreground mt-1">Registra cobros pendientes</p>
              <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
                Agregar primer cobro
              </button>
            </div>
          ) : (
            accounts.map((ar) => {
              const display = getDisplayStatus(ar)
              const overdue = display === 'overdue'
              return (
                <div key={ar.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${overdue ? 'bg-danger/[0.08] text-danger' : display === 'paid' ? 'bg-success/[0.08] text-success' : 'bg-warning/[0.08] text-warning'}`}>
                    <ArrowDownLeft size={14} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ar.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {ar.contact?.name || 'Sin contacto'} · Vence: <span className={overdue ? 'text-danger font-medium' : ''}>{formatDate(ar.dueDate)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(ar.balance)}</p>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_BADGE[display] || 'bg-muted text-muted-foreground'}`}>
                      {overdue ? 'Vencida' : STATUS_LABELS[ar.status] || ar.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!overdue && ar.status !== 'paid' && (
                      <button onClick={() => { setPaymentModal(ar); setPaymentForm(emptyPayment) }} className="w-7 h-7 rounded-lg hover:bg-success/[0.06] flex items-center justify-center text-muted-foreground hover:text-success transition-colors" title="Cobrar">
                        <CircleDollarSign size={13} />
                      </button>
                    )}
                    <button onClick={() => openEdit(ar)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(ar)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
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
          title={editing ? 'Editar cuenta por cobrar' : 'Nuevo cobro'}
          subtitle={editing ? 'Actualizar datos del cobro' : 'Registrar una nueva cuenta por cobrar'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Contacto *</label>
              <input type="text" required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputClass} placeholder="Nombre del contacto" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Descripcion *</label>
              <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="Ej: Venta servicio pintura" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Monto original *</label>
              <input type="number" required min="0" step="any" value={form.originalAmount} onChange={(e) => setForm({ ...form, originalAmount: e.target.value })} className={inputClass} placeholder="0" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha emision *</label>
                <input type="date" required value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha vencimiento *</label>
                <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Notas</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass + ' min-h-[72px] resize-none'} placeholder="Notas adicionales..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              {formError && (<p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>)}
              <button type="submit" disabled={saving || !form.contactName.trim() || !form.description.trim() || !form.originalAmount || !form.issueDate || !form.dueDate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {paymentModal && (
        <Modal title="Registrar cobro" subtitle={`Cobro: ${paymentModal.description}`} onClose={() => setPaymentModal(null)}>
          <form onSubmit={handlePayment} className="p-4 sm:p-5 space-y-4">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(paymentModal.balance)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Monto *</label>
              <input type="number" required min="0" step="any" max={paymentModal.balance} value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha de cobro</label>
              <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} className={inputClass} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPaymentModal(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={paying || !paymentForm.amount} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors disabled:opacity-50">
                {paying ? 'Registrando...' : 'Registrar cobro'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar cuenta por cobrar"
          message={`¿Seguro que deseas eliminar "${deleteTarget.description}"? Se eliminaran ${deleteTarget.payments.length} pagos registrados. Esta accion no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
