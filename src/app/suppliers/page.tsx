'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'

interface Supplier {
  id: string
  name: string
  documentType: string | null
  documentNumber: string | null
  email: string | null
  phone: string | null
  address: string | null
  contactPerson: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
}

const emptyForm = {
  name: '',
  documentType: 'CC',
  documentNumber: '',
  email: '',
  phone: '',
  address: '',
  contactPerson: '',
  notes: '',
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [loadError, setLoadError] = useState('')

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts?type=supplier')
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) {
        setSuppliers([])
        setLoadError(
          (data && typeof data === 'object' && typeof data.error === 'string' ? data.error : '') ||
            'No se pudieron cargar los proveedores. Revisa la conexión e intenta de nuevo.'
        )
        return
      }
      setSuppliers(data)
      setLoadError('')
    } catch {
      console.error('Error fetching suppliers')
      setLoadError('No se pudieron cargar los proveedores. Revisa la conexión e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.documentNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = suppliers.filter((s) => s.isActive).length

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({
      name: s.name,
      documentType: s.documentType || 'CC',
      documentNumber: s.documentNumber || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      contactPerson: s.contactPerson || '',
      notes: s.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setFormError('')
    setSaving(true)

    const payload = {
      ...form,
      documentNumber: form.documentNumber || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      contactPerson: form.contactPerson || null,
      notes: form.notes || null,
      type: 'supplier',
    }

    try {
      if (editing) {
        const res = await fetch(`/api/contacts/${editing.id}`, {
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
        const res = await fetch('/api/contacts', {
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
      fetchSuppliers()
    } catch {
      setFormError('Error de conexión. Intente de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/contacts/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchSuppliers()
    } catch {
      console.error('Error deleting supplier')
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Directorio de proveedores</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nuevo proveedor
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-danger/20 bg-danger/[0.04] px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total proveedores</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{suppliers.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activos</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-success">{activeCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inactivos</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-muted-foreground">{suppliers.length - activeCount}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <h2 className="font-semibold text-sm">Proveedores</h2>
          <span className="text-xs text-muted-foreground mr-auto">{filtered.length} registros</span>
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
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
                <Users size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">
                {search ? 'Sin resultados' : 'Sin proveedores registrados'}
              </p>
              {!search && (
                <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
                  Agregar primer proveedor
                </button>
              )}
            </div>
          ) : (
            filtered.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.documentNumber && <span>{s.documentType} {s.documentNumber} · </span>}
                    {s.email || s.phone || 'Sin contacto'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${s.isActive ? 'bg-success/[0.08] text-success' : 'bg-muted text-muted-foreground'}`}>
                  {s.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(s)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
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
          title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
          subtitle={editing ? 'Actualizar datos del proveedor' : 'Agregar un nuevo proveedor al directorio'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Nombre *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="Nombre del proveedor"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Tipo documento</label>
                <select
                  value={form.documentType}
                  onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                  className={inputClass}
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="NIT">NIT</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="TI">Tarjeta Identidad</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Número documento</label>
                <input
                  type="text"
                  value={form.documentNumber}
                  onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: 1234567890"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  placeholder="correo@proveedor.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Teléfono</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: 300 123 4567"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClass}
                placeholder="Dirección del proveedor"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Persona de contacto</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className={inputClass}
                placeholder="Nombre del contacto directo"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass + ' min-h-[72px] resize-none'}
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
                disabled={saving || !form.name.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar proveedor"
          message={`¿Seguro que deseas eliminar a "${deleteTarget.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
