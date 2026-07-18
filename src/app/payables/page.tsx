'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowUpRight, Plus, Pencil, Trash2, CircleDollarSign, Camera, FileText, Loader2, X, Banknote, Building2, ChevronDown } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface AP {
  id: string
  description: string
  contactId: string | null
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

interface PaymentMethod {
  id: string
  name: string
  type: string
}

interface BankAccount {
  id: string
  bankName: string
  accountType: string | null
  accountNumber: string | null
}

const emptyPayment = {
  amount: '',
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethodId: '',
  sourceType: 'cash_register',
  sourceId: '',
  notes: '',
}

function isOverdue(ap: AP): boolean {
  return ap.status !== 'paid' && new Date(ap.dueDate) < new Date()
}

function getDisplayStatus(ap: AP): string {
  if (isOverdue(ap)) return 'overdue'
  return ap.status
}

export default function PayablesPage() {
  const [accounts, setAccounts] = useState<AP[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AP | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AP | null>(null)
  const [paymentModal, setPaymentModal] = useState<AP | null>(null)
  const [paymentForm, setPaymentForm] = useState(emptyPayment)
  const [paying, setPaying] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null)
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts-payable')
      const data = await res.json()
      setAccounts(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching AP')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/payment-methods')
      const data = await res.json()
      setPaymentMethods(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/bank-accounts')
      const data = await res.json()
      setBankAccounts(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  useEffect(() => { fetchPaymentMethods(); fetchBankAccounts() }, [fetchPaymentMethods, fetchBankAccounts])

  const totalPending = accounts.filter((a) => a.status !== 'paid').reduce((s, a) => s + a.balance, 0)
  const overdueCount = accounts.filter(isOverdue).length
  const totalAP = accounts.reduce((s, a) => s + a.originalAmount, 0)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setSelectedFile(null)
    setUploadedDocUrl(null)
    setUploadedDocName(null)
    setModalOpen(true)
  }

  const openEdit = (ap: AP) => {
    setEditing(ap)
    setForm({
      contactName: ap.contact?.name || '',
      description: ap.description,
      originalAmount: String(ap.originalAmount),
      issueDate: ap.issueDate.split('T')[0],
      dueDate: ap.dueDate.split('T')[0],
      notes: ap.notes || '',
    })
    setFormError('')
    setSelectedFile(null)
    setUploadedDocUrl(null)
    setUploadedDocName(null)
    fetch(`/api/documents?referenceType=accounts_payable&referenceId=${ap.id}`)
      .then(res => res.json())
      .then(docs => {
        if (docs.length > 0) {
          setUploadedDocUrl(docs[0].fileUrl)
          setUploadedDocName(docs[0].name)
        }
      })
      .catch(() => {})
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
      body: JSON.stringify({ name, type: 'supplier' }),
    })
    const created = await createRes.json()
    return created.id
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim() || !form.originalAmount || !form.issueDate || !form.dueDate) return
    setFormError('')
    setSaving(true)

    try {
      const contactId = form.contactName.trim() ? await findOrCreateContact(form.contactName) : null
      const payload = {
        contactId,
        description: form.description,
        originalAmount: parseFloat(form.originalAmount),
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        notes: form.notes || null,
      }

      if (editing) {
        const res = await fetch(`/api/accounts-payable/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, balance: parseFloat(form.originalAmount) }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
        if (selectedFile) {
          await uploadDocument(editing.id, selectedFile)
        }
      } else {
        const res = await fetch('/api/accounts-payable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
        const created = await res.json()
        if (selectedFile) {
          await uploadDocument(created.id, selectedFile)
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

  const uploadDocument = async (apId: string, file: File) => {
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', 'invoice')
      formData.append('referenceType', 'accounts_payable')
      formData.append('referenceId', apId)
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const doc = await res.json()
        setUploadedDocUrl(doc.fileUrl)
        setUploadedDocName(doc.name)
      }
    } catch {
      console.error('Error uploading document')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/accounts-payable/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchAccounts()
    } catch {
      console.error('Error deleting AP')
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModal || !paymentForm.amount) return
    setPaying(true)

    try {
      await fetch(`/api/accounts-payable/${paymentModal.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMethodId: paymentForm.paymentMethodId || null,
          sourceType: paymentForm.sourceType,
          sourceId: paymentForm.sourceType === 'bank_account' ? paymentForm.sourceId : 'default',
          notes: paymentForm.notes || null,
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
          <h1 className="text-2xl font-semibold tracking-tight">Cuentas por Pagar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Dinero que debes a proveedores</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nuevo pago
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
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{formatCurrency(totalAP)}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Cuentas por pagar</h2>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ArrowUpRight size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin cuentas por pagar</p>
              <p className="text-xs text-muted-foreground mt-1">Registra pagos pendientes a proveedores</p>
              <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
                Agregar primera cuenta
              </button>
            </div>
          ) : (
            accounts.map((ap) => {
              const display = getDisplayStatus(ap)
              const overdue = display === 'overdue'
              return (
                <div key={ap.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${overdue ? 'bg-danger/[0.08] text-danger' : display === 'paid' ? 'bg-success/[0.08] text-success' : 'bg-warning/[0.08] text-warning'}`}>
                    <ArrowUpRight size={14} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ap.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {ap.contact?.name || 'Sin contacto'} · Vence: <span className={overdue ? 'text-danger font-medium' : ''}>{formatDate(ap.dueDate)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(ap.balance)}</p>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_BADGE[display] || 'bg-muted text-muted-foreground'}`}>
                      {overdue ? 'Vencida' : STATUS_LABELS[ap.status] || ap.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ap.status !== 'paid' && (
                      <button onClick={() => { setPaymentModal(ap); setPaymentForm(emptyPayment) }} className="w-7 h-7 rounded-lg hover:bg-success/[0.06] flex items-center justify-center text-muted-foreground hover:text-success transition-colors" title="Abonar">
                        <CircleDollarSign size={13} />
                      </button>
                    )}
                    <button onClick={() => openEdit(ap)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(ap)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
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
          title={editing ? 'Editar cuenta por pagar' : 'Nuevo pago'}
          subtitle={editing ? 'Actualizar datos de la cuenta' : 'Registrar una nueva cuenta por pagar'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Contacto</label>
              <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputClass} placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Descripcion *</label>
              <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="Ej: Compra materiales" />
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
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Factura</label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
              {uploadedDocUrl && !selectedFile ? (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <FileText size={14} className="text-blue shrink-0" />
                  <span className="text-xs truncate flex-1">{uploadedDocName}</span>
                  <a href={uploadedDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue font-medium hover:underline shrink-0">Ver</a>
                </div>
              ) : selectedFile ? (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <FileText size={14} className="text-success shrink-0" />
                  <span className="text-xs truncate flex-1">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-danger transition-colors shrink-0"><X size={14} /></button>
                </div>
              ) : null}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-blue/40 hover:text-blue transition-colors">
                <Camera size={13} />
                {uploadingFile ? 'Subiendo...' : selectedFile ? 'Cambiar foto' : 'Tomar foto o seleccionar'}
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              {formError && (<p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>)}
              <button type="submit" disabled={saving || uploadingFile || !form.description.trim() || !form.originalAmount || !form.issueDate || !form.dueDate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors disabled:opacity-50">
                {saving || uploadingFile ? <Loader2 size={12} className="animate-spin" /> : null}
                {saving ? 'Guardando...' : uploadingFile ? 'Subiendo factura...' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {paymentModal && (
        <Modal title="Registrar abono" subtitle={`Pago a: ${paymentModal.description}`} onClose={() => setPaymentModal(null)}>
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha de pago</label>
              <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Método de pago</label>
              <div className="relative">
                <select value={paymentForm.paymentMethodId} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethodId: e.target.value })} className={`${inputClass} appearance-none pr-8`}>
                  <option value="">Seleccionar método</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Sale de</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPaymentForm({ ...paymentForm, sourceType: 'cash_register', sourceId: '' })} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${paymentForm.sourceType === 'cash_register' ? 'border-blue/40 bg-blue/[0.06] text-blue' : 'border-border hover:bg-muted text-muted-foreground'}`}>
                  <Banknote size={13} /> Caja
                </button>
                <button type="button" onClick={() => setPaymentForm({ ...paymentForm, sourceType: 'bank_account', sourceId: '' })} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${paymentForm.sourceType === 'bank_account' ? 'border-blue/40 bg-blue/[0.06] text-blue' : 'border-border hover:bg-muted text-muted-foreground'}`}>
                  <Building2 size={13} /> Cuenta bancaria
                </button>
              </div>
            </div>
            {paymentForm.sourceType === 'bank_account' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Cuenta bancaria</label>
                <div className="relative">
                  <select value={paymentForm.sourceId} onChange={(e) => setPaymentForm({ ...paymentForm, sourceId: e.target.value })} className={`${inputClass} appearance-none pr-8`}>
                    <option value="">Seleccionar cuenta</option>
                    {bankAccounts.map((ba) => (
                      <option key={ba.id} value={ba.id}>{ba.bankName} {ba.accountNumber ? `• ${ba.accountNumber}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Notas</label>
              <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className={`${inputClass} min-h-[60px] resize-none`} placeholder="Notas del pago..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPaymentModal(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">Cancelar</button>
              <button type="submit" disabled={paying || !paymentForm.amount} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors disabled:opacity-50">
                {paying ? 'Registrando...' : 'Registrar abono'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar cuenta por pagar"
          message={`¿Seguro que deseas eliminar "${deleteTarget.description}"? Se eliminaran ${deleteTarget.payments.length} pagos registrados. Esta accion no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
