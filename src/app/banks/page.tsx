'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency } from '@/lib/utils'

interface BankAccount {
  id: string
  bankName: string
  accountType: string | null
  accountNumber: string | null
  holderName: string | null
  isActive: boolean
  balance: number
}

const emptyForm = {
  bankName: '',
  accountType: 'ahorro',
  accountNumber: '',
  holderName: '',
}

export default function BanksPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/bank-accounts')
      const data = await res.json()
      setAccounts(data)
    } catch {
      console.error('Error fetching bank accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const activeAccounts = accounts.filter((a) => a.isActive)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (a: BankAccount) => {
    setEditing(a)
    setForm({
      bankName: a.bankName,
      accountType: a.accountType || 'ahorro',
      accountNumber: a.accountNumber || '',
      holderName: a.holderName || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bankName.trim()) return
    setFormError('')
    setSaving(true)

    const payload = {
      bankName: form.bankName,
      accountType: form.accountType || null,
      accountNumber: form.accountNumber || null,
      holderName: form.holderName || null,
    }

    try {
      if (editing) {
        const res = await fetch(`/api/bank-accounts/${editing.id}`, {
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
        const res = await fetch('/api/bank-accounts', {
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
      await fetch(`/api/bank-accounts/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchAccounts()
    } catch {
      console.error('Error deleting bank account')
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'

  const accountTypeLabel = (t: string | null) => {
    const map: Record<string, string> = {
      ahorro: 'Ahorro',
      corriente: 'Corriente',
      davivienda: 'Davivienda',
      'cuenta de ahorro': 'Cuenta de Ahorro',
      'cuenta corriente': 'Cuenta Corriente',
    }
    return t ? (map[t.toLowerCase()] || t) : 'Cuenta'
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bancos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Cuentas bancarias</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nueva cuenta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saldo total</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cuentas</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{activeAccounts.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Building2 size={18} className="text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium">Sin cuentas bancarias registradas</p>
          <p className="text-xs text-muted-foreground mt-0.5">Agrega tu primera cuenta para empezar</p>
          <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
            Agregar cuenta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-200 overflow-hidden">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/[0.06] flex items-center justify-center">
                  <Building2 size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{acc.bankName}</p>
                  <p className="text-xs text-muted-foreground">{accountTypeLabel(acc.accountType)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(acc)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(acc)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums tracking-tight truncate">{formatCurrency(acc.balance)}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {acc.accountNumber || 'Sin numero'}
                {acc.holderName && ` · ${acc.holderName}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Editar cuenta' : 'Nueva cuenta bancaria'}
          subtitle={editing ? 'Actualizar datos de la cuenta' : 'Agregar una nueva cuenta bancaria'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Nombre del banco *</label>
              <input
                type="text"
                required
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className={inputClass}
                placeholder="Ej: Bancolombia, Davivienda..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Tipo de cuenta</label>
                <select
                  value={form.accountType}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                  className={inputClass}
                >
                  <option value="ahorro">Ahorro</option>
                  <option value="corriente">Corriente</option>
                  <option value="davivienda">Davivienda</option>
                  <option value="cuenta de ahorro">Cuenta de Ahorro</option>
                  <option value="cuenta corriente">Cuenta Corriente</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Numero de cuenta</label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: 1234567890"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Titular</label>
              <input
                type="text"
                value={form.holderName}
                onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                className={inputClass}
                placeholder="Nombre del titular de la cuenta"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              {formError && (<p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>)}
              <button
                type="submit"
                disabled={saving || !form.bankName.trim()}
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
          title="Eliminar cuenta bancaria"
          message={`¿Seguro que deseas eliminar la cuenta de "${deleteTarget.bankName}"? Esta accion no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
