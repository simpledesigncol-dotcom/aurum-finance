'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, Pencil, Trash2, ArrowUpRight } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

interface PaymentMethod {
  id: string
  name: string
}

interface Expense {
  id: string
  amount: number
  expenseDate: string
  description: string | null
  receiptNumber: string | null
  notes: string | null
  contactName: string | null
  category: Category | null
  contact: { id: string; name: string } | null
  paymentMethod: PaymentMethod | null
}

const emptyForm = {
  amount: '',
  expenseDate: new Date().toISOString().split('T')[0],
  categoryId: '',
  description: '',
  paymentMethodId: '',
  contactName: '',
  receiptNumber: '',
  notes: '',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const fetchExpenses = useCallback(async (catId?: string) => {
    try {
      const url = catId ? `/api/expenses?categoryId=${catId}` : '/api/expenses'
      const res = await fetch(url)
      const data = await res.json()
      setExpenses(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching expenses')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/categories?type=expense')
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching categories')
    }
  }, [])

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/payment-methods')
      const data = await res.json()
      setPaymentMethods(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching payment methods')
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
    fetchCategories()
    fetchPaymentMethods()
  }, [fetchExpenses, fetchCategories, fetchPaymentMethods])

  const handleCategoryFilter = (catId: string) => {
    setFilterCategory(catId)
    fetchExpenses(catId || undefined)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const now = new Date()
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.expenseDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthTotal = thisMonth.reduce((sum, e) => sum + e.amount, 0)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setForm({
      amount: String(expense.amount),
      expenseDate: expense.expenseDate.split('T')[0],
      categoryId: expense.category?.id || '',
      description: expense.description || '',
      paymentMethodId: expense.paymentMethod?.id || '',
      contactName: expense.contactName || expense.contact?.name || '',
      receiptNumber: expense.receiptNumber || '',
      notes: expense.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.expenseDate) return
    setFormError('')
    setSaving(true)

    const payload = {
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      categoryId: form.categoryId || null,
      description: form.description || null,
      paymentMethodId: form.paymentMethodId || null,
      contactName: form.contactName || null,
      receiptNumber: form.receiptNumber || null,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        const res = await fetch(`/api/expenses/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
      } else {
        const res = await fetch('/api/expenses', {
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
      fetchExpenses(filterCategory || undefined)
    } catch {
      setFormError('Error de conexion. Intente de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/expenses/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchExpenses(filterCategory || undefined)
    } catch {
      console.error('Error deleting expense')
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Control de gastos operativos</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 bg-blue text-white text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-blue/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nuevo gasto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total gastos</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-danger">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Este mes</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-danger">{formatCurrency(thisMonthTotal)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registros</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{expenses.length}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className="w-full max-w-xs px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
          >
            <option value="">Todas las categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Receipt size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin gastos registrados</p>
              <p className="text-xs text-muted-foreground mt-1">Registra tu primer gasto para comenzar</p>
              <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
                Nuevo gasto
              </button>
            </div>
          ) : (
            expenses.map((expense) => (
              <div key={expense.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                <div className="w-8 h-8 rounded-lg bg-danger/[0.08] text-danger flex items-center justify-center shrink-0">
                  <ArrowUpRight size={14} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {expense.description || expense.category?.name || 'Gasto'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {expense.category?.name || 'Sin categoria'}
                    {expense.paymentMethod && ` · ${expense.paymentMethod.name}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-danger">
                    -{formatCurrency(expense.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(expense.expenseDate)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(expense)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(expense)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Editar gasto' : 'Nuevo gasto'}
          subtitle={editing ? 'Actualizar datos del gasto' : 'Registrar un nuevo gasto'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Monto *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fecha *</label>
                <input
                  type="date"
                  required
                  value={form.expenseDate}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Descripcion</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClass}
                placeholder="Descripcion del gasto"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Sin categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Metodo de pago</label>
                <select
                  value={form.paymentMethodId}
                  onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Sin metodo</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">No. Recibo</label>
                <input
                  type="text"
                  value={form.receiptNumber}
                  onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Numero de recibo"
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
                disabled={saving || !form.amount || !form.expenseDate}
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
          title="Eliminar gasto"
          message={`¿Seguro que deseas eliminar este gasto de ${formatCurrency(deleteTarget.amount)}? Esta accion no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
