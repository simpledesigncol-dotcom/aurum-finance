'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Scale,
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  AlertTriangle,
  Clock,
  AlertCircle,
  Search,
  ChevronDown,
  Banknote,
  Building2,
} from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  OBLIGATION_TYPES,
  OBLIGATION_CATEGORIES,
  OBLIGATION_FREQUENCIES,
  OBLIGATION_PRIORITIES,
} from '@/lib/constants'

interface ObligationPayment {
  id: string
  dueDate: string
  amountDue: number
  amountPaid: number
  paymentDate: string | null
  status: string
  notes: string | null
}

interface Obligation {
  id: string
  name: string
  type: string
  originalAmount: number
  paidAmount: number
  balance: number
  interestRate: number
  startDate: string
  endDate: string | null
  paymentFrequency: string | null
  paymentAmount: number | null
  paymentMethodId: string | null
  priority: string
  status: string
  isRecurring: boolean
  nextDueDate: string | null
  notes: string | null
  contactId: string | null
  contact: { id: string; name: string } | null
  paymentMethod: { id: string; name: string } | null
  payments: ObligationPayment[]
}

interface Summary {
  totalBalance: number
  activeCount: number
  overdueCount: number
  upcomingCount: number
  dueTodayCount: number
  paidCount: number
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
  holderName: string | null
}

const TYPE_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue/[0.08] text-blue',
  warning: 'bg-warning/[0.08] text-warning',
  info: 'bg-info/[0.08] text-blue',
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-success/[0.08] text-success',
  danger: 'bg-danger/[0.08] text-danger',
  purple: 'bg-purple/[0.08] text-purple',
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue/[0.08] text-blue',
  high: 'bg-warning/[0.08] text-warning',
  critical: 'bg-danger/[0.08] text-danger',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  critical: 'Crítica',
}

function getComputedStatus(o: Obligation): string {
  if (o.status === 'paid' || o.status === 'completed') return 'paid'
  if (o.status === 'cancelled') return 'cancelled'
  if (o.status === 'active' && o.balance > 0) {
    const dueDate = o.nextDueDate || o.endDate
    if (dueDate) {
      const due = new Date(dueDate)
      due.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diff < 0) return 'overdue'
      if (diff === 0) return 'due_today'
      if (diff <= 7) return 'upcoming'
    }
  }
  return o.status
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue/[0.08] text-blue',
  paid: 'bg-success/[0.08] text-success',
  overdue: 'bg-danger/[0.08] text-danger',
  cancelled: 'bg-muted text-muted-foreground',
  upcoming: 'bg-info/[0.08] text-blue',
  due_today: 'bg-warning/[0.08] text-warning',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  paid: 'Pagada',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
  upcoming: 'Próxima',
  due_today: 'Vence hoy',
}

type FilterTab = 'all' | 'active' | 'overdue' | 'paid'

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Activas' },
  { id: 'overdue', label: 'Vencidas' },
  { id: 'paid', label: 'Pagadas' },
]

const emptyForm = {
  name: '',
  type: 'rent',
  originalAmount: '',
  contactName: '',
  startDate: '',
  endDate: '',
  paymentFrequency: 'monthly',
  paymentAmount: '',
  paymentMethodId: '',
  priority: 'normal',
  isRecurring: false,
  interestRate: '',
  notes: '',
}

const emptyPayment = {
  amount: '',
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethodId: '',
  sourceType: 'cash_register',
  sourceId: '',
  notes: '',
}

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalBalance: 0,
    activeCount: 0,
    overdueCount: 0,
    upcomingCount: 0,
    dueTodayCount: 0,
    paidCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Obligation | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Obligation | null>(null)

  const [paymentModal, setPaymentModal] = useState<Obligation | null>(null)
  const [paymentForm, setPaymentForm] = useState(emptyPayment)
  const [paying, setPaying] = useState(false)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  const fetchObligations = useCallback(async () => {
    try {
      const res = await fetch('/api/obligations')
      const data = await res.json()
      setObligations(data.obligations || [])
      if (data.summary) setSummary(data.summary)
    } catch {
      console.error('Error fetching obligations')
    } finally {
      setLoading(false)
    }
  }, [])

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

  useEffect(() => {
    fetchObligations()
    fetchPaymentMethods()
    fetchBankAccounts()
  }, [fetchObligations, fetchPaymentMethods, fetchBankAccounts])

  const filtered = useMemo(() => {
    let list = obligations
    if (filter === 'active') list = list.filter((o) => o.status === 'active')
    else if (filter === 'overdue') list = list.filter((o) => getComputedStatus(o) === 'overdue')
    else if (filter === 'paid') list = list.filter((o) => o.status === 'paid' || o.status === 'completed')

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.type.toLowerCase().includes(q) ||
          o.contact?.name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [obligations, filter, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (o: Obligation) => {
    setEditing(o)
    setForm({
      name: o.name,
      type: o.type,
      originalAmount: String(o.originalAmount),
      contactName: o.contact?.name || '',
      startDate: o.startDate ? o.startDate.split('T')[0] : '',
      endDate: o.endDate ? o.endDate.split('T')[0] : '',
      paymentFrequency: o.paymentFrequency || 'monthly',
      paymentAmount: o.paymentAmount ? String(o.paymentAmount) : '',
      paymentMethodId: o.paymentMethodId || '',
      priority: o.priority || 'normal',
      isRecurring: o.isRecurring,
      interestRate: o.interestRate ? String(o.interestRate) : '',
      notes: o.notes || '',
    })
    setModalOpen(true)
  }

  const findOrCreateContact = async (name: string): Promise<string | null> => {
    if (!name.trim()) return null
    const res = await fetch('/api/contacts')
    const contacts = await res.json()
    const existing = contacts.find(
      (c: { name: string }) => c.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) return existing.id
    const createRes = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'other' }),
    })
    const created = await createRes.json()
    return created.id
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.originalAmount || !form.startDate) return
    setSaving(true)
    setFormError('')

    try {
      const contactId = await findOrCreateContact(form.contactName)
      const payload = {
        name: form.name,
        type: form.type,
        originalAmount: parseFloat(form.originalAmount),
        startDate: form.startDate,
        endDate: form.endDate || null,
        contactId,
        interestRate: form.interestRate ? parseFloat(form.interestRate) : 0,
        paymentFrequency: form.paymentFrequency || null,
        paymentAmount: form.paymentAmount ? parseFloat(form.paymentAmount) : null,
        paymentMethodId: form.paymentMethodId || null,
        priority: form.priority,
        isRecurring: form.isRecurring,
        notes: form.notes || null,
      }

      let res
      if (editing) {
        res = await fetch(`/api/obligations/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            balance: parseFloat(form.originalAmount) - editing.paidAmount,
          }),
        })
      } else {
        res = await fetch('/api/obligations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setFormError(err.error || `Error ${res.status}`)
        return
      }

      setModalOpen(false)
      fetchObligations()
    } catch (err) {
      console.error('Error saving obligation:', err)
      setFormError('Error de conexión. Verifica tu internet.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/obligations/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchObligations()
    } catch {
      console.error('Error deleting obligation')
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModal || !paymentForm.amount) return
    setPaying(true)

    try {
      await fetch(`/api/obligations/${paymentModal.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          dueDate: paymentForm.paymentDate,
          paymentDate: paymentForm.paymentDate,
          paymentMethodId: paymentForm.paymentMethodId || null,
          sourceType: paymentForm.sourceType,
          sourceId: paymentForm.sourceType === 'bank_account' ? paymentForm.sourceId : 'default',
          notes: paymentForm.notes || null,
        }),
      })
      setPaymentModal(null)
      setPaymentForm(emptyPayment)
      fetchObligations()
    } catch {
      console.error('Error recording payment')
    } finally {
      setPaying(false)
    }
  }

  const getTypeInfo = (typeId: string) => {
    return OBLIGATION_TYPES.find((t) => t.id === typeId)
  }

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'
  const labelClass = 'text-xs font-medium text-muted-foreground'
  const cardClass = 'bg-card rounded-xl border border-border p-4'
  const primaryBtnClass =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors'

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Obligaciones</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestión de compromisos financieros</p>
        </div>
        <button onClick={openCreate} className={primaryBtnClass}>
          <Plus size={14} strokeWidth={1.8} />
          Nueva obligación
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={cardClass}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Saldo total
          </span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-danger">
            {formatCurrency(summary.totalBalance)}
          </p>
        </div>
        <div className={cardClass}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Activas
          </span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-blue">
            {summary.activeCount}
          </p>
        </div>
        <div className={cardClass}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Vencidas
          </span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-danger">
            {summary.overdueCount}
          </p>
        </div>
        <div className={cardClass}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Próximas
          </span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-warning">
            {summary.upcomingCount + summary.dueTodayCount}
          </p>
        </div>
      </div>

      {(summary.overdueCount > 0 || summary.dueTodayCount > 0 || summary.upcomingCount > 0) && (
        <div className="space-y-2">
          {summary.overdueCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger/[0.06] border border-danger/10">
              <AlertCircle size={14} className="text-danger shrink-0" />
              <p className="text-xs font-medium text-danger">
                {summary.overdueCount} obligación{summary.overdueCount !== 1 ? 'es' : ''} vencida{summary.overdueCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          {summary.dueTodayCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/[0.06] border border-warning/10">
              <Clock size={14} className="text-warning shrink-0" />
              <p className="text-xs font-medium text-warning">
                {summary.dueTodayCount} obligación{summary.dueTodayCount !== 1 ? 'es' : ''} vence{summary.dueTodayCount === 1 ? '' : 'n'} hoy
              </p>
            </div>
          )}
          {summary.upcomingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue/[0.06] border border-blue/10">
              <Clock size={14} className="text-blue shrink-0" />
              <p className="text-xs font-medium text-blue">
                {summary.upcomingCount} obligación{summary.upcomingCount !== 1 ? 'es' : ''} próxima{summary.upcomingCount !== 1 ? 's' : ''} (7 días)
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === tab.id
                    ? 'bg-blue/[0.08] text-blue'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Scale size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin obligaciones registradas</p>
              <p className="text-xs text-muted-foreground mt-1">
                Registra tus compromisos financieros
              </p>
              <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
                Agregar primera obligación
              </button>
            </div>
          ) : (
            filtered.map((o) => {
              const typeInfo = getTypeInfo(o.type)
              const computed = getComputedStatus(o)
              const progress = o.originalAmount > 0 ? (o.paidAmount / o.originalAmount) * 100 : 0
              const dueDisplay = o.nextDueDate || o.endDate

              return (
                <div
                  key={o.id}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${
                      TYPE_COLOR_MAP[typeInfo?.color || 'muted'] || 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {typeInfo?.icon || '📋'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{o.name}</p>
                      <span
                        className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                          TYPE_COLOR_MAP[typeInfo?.color || 'muted'] || 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {typeInfo?.label || o.type}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                          PRIORITY_STYLES[o.priority] || 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {PRIORITY_LABELS[o.priority] || o.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {o.contact?.name && (
                        <p className="text-xs text-muted-foreground">{o.contact.name}</p>
                      )}
                      <div className="flex-1 max-w-[200px]">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatCurrency(o.paidAmount)} de {formatCurrency(o.originalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(o.balance)}</p>
                    <span
                      className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                        STATUS_STYLES[computed] || 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {STATUS_LABELS[computed] || computed}
                    </span>
                  </div>

                  {dueDisplay && (
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-[10px] text-muted-foreground">Vence</p>
                      <p className="text-xs font-medium">{formatDate(dueDisplay)}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {o.status === 'active' && o.balance > 0 && (
                      <button
                        onClick={() => {
                          setPaymentModal(o)
                          setPaymentForm(emptyPayment)
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-success/[0.06] flex items-center justify-center text-muted-foreground hover:text-success transition-colors"
                        title="Pagar"
                      >
                        <CreditCard size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(o)}
                      className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(o)}
                      className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors"
                      title="Eliminar"
                    >
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
          title={editing ? 'Editar obligación' : 'Nueva obligación'}
          subtitle={editing ? 'Actualizar datos de la obligación' : 'Registrar un nuevo compromiso financiero'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={`${labelClass} block mb-1.5`}>Nombre *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: Arriendo oficina"
                />
              </div>

              <div className="col-span-2">
                <label className={`${labelClass} block mb-1.5`}>Categoría / Tipo *</label>
                <div className="relative">
                  <select
                    value={form.type}
                    onChange={(e) => {
                      const newType = e.target.value
                      const isGastoFijo = OBLIGATION_TYPES.find(t => t.id === newType)?.category === 'Gastos Fijos'
                      setForm({
                        ...form,
                        type: newType,
                        isRecurring: isGastoFijo ? true : form.isRecurring,
                        paymentFrequency: isGastoFijo && !form.paymentFrequency ? 'monthly' : form.paymentFrequency,
                      })
                    }}
                    className={`${inputClass} appearance-none pr-8`}
                  >
                    {OBLIGATION_CATEGORIES.map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {OBLIGATION_TYPES.filter((t) => t.category === cat).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.icon} {t.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>

              {(() => {
                const selectedType = OBLIGATION_TYPES.find(t => t.id === form.type)
                const isGastoFijo = selectedType?.category === 'Gastos Fijos' || selectedType?.category === 'Servicios Digitales'

                return (
                  <>
                    <div>
                      <label className={`${labelClass} block mb-1.5`}>{isGastoFijo ? 'Monto mensual *' : 'Monto total *'}</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={form.originalAmount}
                        onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                        className={inputClass}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={`${labelClass} block mb-1.5`}>Proveedor / Beneficiario</label>
                      <input
                        type="text"
                        value={form.contactName}
                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                        className={inputClass}
                        placeholder="Nombre del contacto"
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} block mb-1.5`}>Fecha inicio *</label>
                      <input
                        type="date"
                        required
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    {!isGastoFijo && (
                      <div>
                        <label className={`${labelClass} block mb-1.5`}>Fecha fin</label>
                        <input
                          type="date"
                          value={form.endDate}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    )}

                    <div>
                      <label className={`${labelClass} block mb-1.5`}>Frecuencia</label>
                      <div className="relative">
                        <select
                          value={form.paymentFrequency}
                          onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value })}
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          {OBLIGATION_FREQUENCIES.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                      </div>
                    </div>
                    {!isGastoFijo && (
                      <div>
                        <label className={`${labelClass} block mb-1.5`}>Cuota por pago</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={form.paymentAmount}
                          onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })}
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                    )}

                    <div>
                      <label className={`${labelClass} block mb-1.5`}>Método de pago</label>
                      <div className="relative">
                        <select
                          value={form.paymentMethodId}
                          onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          <option value="">Sin método</option>
                          {paymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`${labelClass} block mb-1.5`}>Prioridad</label>
                      <div className="relative">
                        <select
                          value={form.priority}
                          onChange={(e) => setForm({ ...form, priority: e.target.value })}
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          {OBLIGATION_PRIORITIES.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                      </div>
                    </div>

                    {!isGastoFijo && (
                      <div>
                        <label className={`${labelClass} block mb-1.5`}>Tasa interés %</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={form.interestRate}
                          onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                    )}

                    <div className="col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isRecurring}
                          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                          className="w-4 h-4 rounded border-border text-blue focus:ring-blue/20"
                        />
                        <span className={`${labelClass}`}>Pago recurrente</span>
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-1 ml-6">
                        {isGastoFijo
                          ? 'Este tipo de gasto se marca como recurrente automáticamente'
                          : 'Activa si se paga periódicamente (no es deuda única)'}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <label className={`${labelClass} block mb-1.5`}>Notas</label>
                      <textarea
                        value={form.notes || ''}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className={`${inputClass} min-h-[64px] resize-none`}
                        placeholder="Notas adicionales..."
                      />
                    </div>
                  </>
                )
              })()}
            </div>

            {formError && (
              <p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim() || !form.originalAmount || !form.startDate}
                className={`${primaryBtnClass} disabled:opacity-50`}
              >
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {paymentModal && (
        <Modal
          title="Registrar pago"
          subtitle={`Pago a: ${paymentModal.name}`}
          onClose={() => setPaymentModal(null)}
        >
          <form onSubmit={handlePayment} className="p-5 space-y-4">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(paymentModal.balance)}
              </p>
            </div>

            <div>
              <label className={`${labelClass} block mb-1.5`}>Monto *</label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                max={paymentModal.balance}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className={inputClass}
                placeholder="0"
              />
            </div>

            <div>
              <label className={`${labelClass} block mb-1.5`}>Fecha de pago</label>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={`${labelClass} block mb-1.5`}>Método de pago</label>
              <div className="relative">
                <select
                  value={paymentForm.paymentMethodId}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentMethodId: e.target.value })
                  }
                  className={`${inputClass} appearance-none pr-8`}
                >
                  <option value="">Seleccionar método</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label className={`${labelClass} block mb-1.5`}>Fuente</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentForm({ ...paymentForm, sourceType: 'cash_register', sourceId: '' })
                  }
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    paymentForm.sourceType === 'cash_register'
                      ? 'border-blue/40 bg-blue/[0.06] text-blue'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Banknote size={13} />
                  Caja
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentForm({ ...paymentForm, sourceType: 'bank_account', sourceId: '' })
                  }
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    paymentForm.sourceType === 'bank_account'
                      ? 'border-blue/40 bg-blue/[0.06] text-blue'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Building2 size={13} />
                  Cuenta bancaria
                </button>
              </div>
            </div>

            {paymentForm.sourceType === 'bank_account' && (
              <div>
                <label className={`${labelClass} block mb-1.5`}>Cuenta bancaria</label>
                <div className="relative">
                  <select
                    value={paymentForm.sourceId}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, sourceId: e.target.value })
                    }
                    className={`${inputClass} appearance-none pr-8`}
                  >
                    <option value="">Seleccionar cuenta</option>
                    {bankAccounts.map((ba) => (
                      <option key={ba.id} value={ba.id}>
                        {ba.bankName} {ba.accountNumber ? `• ${ba.accountNumber}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`${labelClass} block mb-1.5`}>Notas</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className={`${inputClass} min-h-[60px] resize-none`}
                placeholder="Notas del pago..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={paying || !paymentForm.amount}
                className={`${primaryBtnClass} disabled:opacity-50`}
              >
                {paying ? 'Registrando...' : 'Registrar pago'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar obligación"
          message={`¿Seguro que deseas eliminar "${deleteTarget.name}"? Se eliminarán ${deleteTarget.payments.length} pago${deleteTarget.payments.length !== 1 ? 's' : ''} registrado${deleteTarget.payments.length !== 1 ? 's' : ''}. Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
