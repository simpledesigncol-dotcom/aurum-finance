'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Building2, Tag, CreditCard, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'

interface Company {
  id: string
  name: string
  nit: string | null
  address: string | null
  phone: string | null
  email: string | null
}

interface Category {
  id: string
  name: string
  type: string
  icon: string | null
  color: string | null
  sortOrder: number
}

interface PaymentMethod {
  id: string
  name: string
  type: string
}

const tabs = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'categorias', label: 'Categorías', icon: Tag },
  { id: 'metodos', label: 'Métodos de Pago', icon: CreditCard },
]

const categoryTypes = [
  { id: 'expense', label: 'Gasto' },
  { id: 'income', label: 'Ingreso' },
  { id: 'service', label: 'Servicio' },
  { id: 'product', label: 'Producto' },
]

const paymentTypeOptions = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'bank', label: 'Bancario' },
  { id: 'digital', label: 'Digital' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('empresa')
  const [company, setCompany] = useState<Company | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  const [companyForm, setCompanyForm] = useState({ name: '', nit: '', address: '', phone: '', email: '' })
  const [savingCompany, setSavingCompany] = useState(false)
  const [formError, setFormError] = useState('')
  const [companySaved, setCompanySaved] = useState(false)

  const [catFilter, setCatFilter] = useState('')
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', icon: '', color: '' })
  const [savingCat, setSavingCat] = useState(false)
  const [deleteCat, setDeleteCat] = useState<Category | null>(null)

  const [pmModalOpen, setPmModalOpen] = useState(false)
  const [pmForm, setPmForm] = useState({ name: '', type: 'cash' })
  const [savingPm, setSavingPm] = useState(false)
  const [deletePm, setDeletePm] = useState<PaymentMethod | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.company) {
        setCompany(data.company)
        setCompanyForm({
          name: data.company.name || '',
          nit: data.company.nit || '',
          address: data.company.address || '',
          phone: data.company.phone || '',
          email: data.company.email || '',
        })
      }
      setCategories(Array.isArray(data.categories) ? data.categories : [])
      setPaymentMethods(Array.isArray(data.paymentMethods) ? data.paymentMethods : [])
    } catch {
      console.error('Error fetching settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSavingCompany(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setFormError(err.error || `Error ${res.status}`)
        return
      }
      const updated = await res.json()
      setCompany(updated)
      setCompanySaved(true)
      setTimeout(() => setCompanySaved(false), 3000)
    } catch {
      setFormError('Error de conexion. Intente de nuevo.')
    } finally {
      setSavingCompany(false)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catForm.name) return
    setFormError('')
    setSavingCat(true)
    try {
      const res = await fetch('/api/settings/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setFormError(err.error || `Error ${res.status}`)
        return
      }
      const cat = await res.json()
      setCategories(prev => [...prev, cat].sort((a, b) => a.sortOrder - b.sortOrder))
      setCatModalOpen(false)
      setCatForm({ name: '', type: 'expense', icon: '', color: '' })
    } catch {
      setFormError('Error de conexion. Intente de nuevo.')
    } finally {
      setSavingCat(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCat) return
    try {
      await fetch(`/api/settings/categories/${deleteCat.id}`, { method: 'DELETE' })
      setCategories(prev => prev.filter(c => c.id !== deleteCat.id))
      setDeleteCat(null)
    } catch {
      console.error('Error deleting category')
    }
  }

  const handleCreatePm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pmForm.name) return
    setFormError('')
    setSavingPm(true)
    try {
      const res = await fetch('/api/settings/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pmForm),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setFormError(err.error || `Error ${res.status}`)
        return
      }
      const pm = await res.json()
      setPaymentMethods(prev => [...prev, pm])
      setPmModalOpen(false)
      setPmForm({ name: '', type: 'cash' })
    } catch {
      setFormError('Error de conexion. Intente de nuevo.')
    } finally {
      setSavingPm(false)
    }
  }

  const handleDeletePm = async () => {
    if (!deletePm) return
    try {
      await fetch(`/api/settings/payment-methods/${deletePm.id}`, { method: 'DELETE' })
      setPaymentMethods(prev => prev.filter(p => p.id !== deletePm.id))
      setDeletePm(null)
    } catch {
      console.error('Error deleting payment method')
    }
  }

  const filteredCategories = catFilter
    ? categories.filter(c => c.type === catFilter)
    : categories

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'
  const labelClass = 'text-xs font-medium text-muted-foreground'

  if (loading) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-96 bg-card rounded-xl border border-border animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ajustes generales del sistema</p>
      </div>

      <div className="flex items-center bg-muted rounded-lg p-[3px] w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'empresa' && (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
            <Building2 size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Datos de la empresa</h2>
          </div>
          <form onSubmit={handleSaveCompany} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Nombre *</label>
                <input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>NIT</label>
                <input
                  type="text"
                  value={companyForm.nit}
                  onChange={(e) => setCompanyForm({ ...companyForm, nit: e.target.value })}
                  className={inputClass}
                  placeholder="900123456-7"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Dirección</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className={inputClass}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Teléfono</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className={inputClass}
                  placeholder="300 123 4567"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className={inputClass}
                  placeholder="empresa@correo.com"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              {companySaved && (
                <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
                  <CheckCircle2 size={13} />
                  Guardado correctamente
                </span>
              )}
              {formError && (<p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>)}
              <div className="flex-1" />
              <button
                type="submit"
                disabled={savingCompany || !companyForm.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors disabled:opacity-50"
              >
                {savingCompany ? <Loader2 size={13} className="animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'categorias' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={15} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Categorías</h2>
                <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{categories.length}</span>
              </div>
              <button
                onClick={() => { setCatForm({ name: '', type: 'expense', icon: '', color: '' }); setFormError(''); setCatModalOpen(true) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors"
              >
                <Plus size={13} />
                Nueva categoría
              </button>
            </div>

            <div className="px-5 py-2.5 border-b border-border flex items-center gap-2">
              <button
                onClick={() => setCatFilter('')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                  catFilter === '' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todas
              </button>
              {categoryTypes.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => setCatFilter(ct.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                    catFilter === ct.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>

            <div className="divide-y divide-border">
              {filteredCategories.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Tag size={18} className="text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium">Sin categorías</p>
                  <p className="text-xs text-muted-foreground mt-1">Crea tu primera categoría para organizar movimientos</p>
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div key={cat.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm shrink-0">
                      {cat.icon || '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">Orden: {cat.sortOrder}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground shrink-0">
                      {categoryTypes.find(ct => ct.id === cat.type)?.label || cat.type}
                    </span>
                    <button
                      onClick={() => setDeleteCat(cat)}
                      className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metodos' && (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Métodos de Pago</h2>
              <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{paymentMethods.length}</span>
            </div>
              <button
                onClick={() => { setPmForm({ name: '', type: 'cash' }); setFormError(''); setPmModalOpen(true) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors"
            >
              <Plus size={13} />
              Nuevo método
            </button>
          </div>

          <div className="divide-y divide-border">
            {paymentMethods.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <CreditCard size={18} className="text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium">Sin métodos de pago</p>
                <p className="text-xs text-muted-foreground mt-1">Crea métodos de pago para registrar transacciones</p>
              </div>
            ) : (
              paymentMethods.map((pm) => (
                <div key={pm.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm shrink-0">
                    <CreditCard size={14} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pm.name}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground shrink-0">
                    {paymentTypeOptions.find(pt => pt.id === pm.type)?.label || pm.type}
                  </span>
                  <button
                    onClick={() => setDeletePm(pm)}
                    className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {catModalOpen && (
        <Modal
          title="Nueva categoría"
          subtitle="Crear una categoría para organizar movimientos"
          onClose={() => setCatModalOpen(false)}
        >
          <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Nombre *</label>
              <input
                type="text"
                required
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className={inputClass}
                placeholder="Nombre de la categoría"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Tipo *</label>
              <select
                value={catForm.type}
                onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}
                className={inputClass}
              >
                {categoryTypes.map(ct => (
                  <option key={ct.id} value={ct.id}>{ct.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelClass}>Icono (emoji)</label>
                <input
                  type="text"
                  value={catForm.icon}
                  onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                  className={inputClass}
                  placeholder="📋"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Color</label>
                <input
                  type="text"
                  value={catForm.color}
                  onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                  className={inputClass}
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCatModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              {formError && (<p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>)}
              <button
                type="submit"
                disabled={savingCat || !catForm.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors disabled:opacity-50"
              >
                {savingCat ? <Loader2 size={13} className="animate-spin" /> : null}
                Crear
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pmModalOpen && (
        <Modal
          title="Nuevo método de pago"
          subtitle="Agregar un método de pago disponible"
          onClose={() => setPmModalOpen(false)}
        >
          <form onSubmit={handleCreatePm} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Nombre *</label>
              <input
                type="text"
                required
                value={pmForm.name}
                onChange={(e) => setPmForm({ ...pmForm, name: e.target.value })}
                className={inputClass}
                placeholder="Nombre del método"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Tipo *</label>
              <select
                value={pmForm.type}
                onChange={(e) => setPmForm({ ...pmForm, type: e.target.value })}
                className={inputClass}
              >
                {paymentTypeOptions.map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPmModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              {formError && (<p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>)}
              <button
                type="submit"
                disabled={savingPm || !pmForm.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors disabled:opacity-50"
              >
                {savingPm ? <Loader2 size={13} className="animate-spin" /> : null}
                Crear
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteCat && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={`¿Seguro que deseas eliminar "${deleteCat.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDeleteCategory}
          onCancel={() => setDeleteCat(null)}
        />
      )}

      {deletePm && (
        <ConfirmDialog
          title="Eliminar método de pago"
          message={`¿Seguro que deseas eliminar "${deletePm.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDeletePm}
          onCancel={() => setDeletePm(null)}
        />
      )}
    </div>
  )
}
