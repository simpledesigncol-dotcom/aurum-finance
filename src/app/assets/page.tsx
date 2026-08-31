'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Asset {
  id: string
  name: string
  assetType: string
  purchaseDate: string
  purchasePrice: number
  salvageValue: number
  usefulLifeMonths: number
  accumulatedDepreciation: number
  netBookValue: number
  status: string
  serialNumber: string | null
  location: string | null
  notes: string | null
}

const assetTypeOptions = [
  { id: 'equipment', label: 'Equipo / Herramienta' },
  { id: 'vehicle', label: 'Vehículo' },
  { id: 'furniture', label: 'Mobiliario' },
  { id: 'real_estate', label: 'Inmueble' },
  { id: 'software', label: 'Software / Licencia' },
]

const assetStatusOptions = [
  { id: 'active', label: 'Activo' },
  { id: 'inactive', label: 'Inactivo' },
  { id: 'disposed', label: 'Dado de baja' },
]

const emptyForm = {
  name: '',
  assetType: 'equipment',
  purchaseDate: new Date().toISOString().split('T')[0],
  purchasePrice: '',
  usefulLifeMonths: '',
  salvageValue: '',
  serialNumber: '',
  location: '',
  notes: '',
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/assets')
      const data = await res.json()
      setAssets(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching assets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  const totalValue = assets.reduce((sum, a) => sum + a.purchasePrice, 0)
  const totalNetBook = assets.reduce((sum, a) => sum + a.netBookValue, 0)
  const totalDepreciation = assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0)
  const activeCount = assets.filter(a => a.status === 'active').length

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditing(asset)
    setForm({
      name: asset.name,
      assetType: asset.assetType,
      purchaseDate: asset.purchaseDate.split('T')[0],
      purchasePrice: String(asset.purchasePrice),
      usefulLifeMonths: String(asset.usefulLifeMonths),
      salvageValue: String(asset.salvageValue),
      serialNumber: asset.serialNumber || '',
      location: asset.location || '',
      notes: asset.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.purchasePrice || !form.usefulLifeMonths) return
    setFormError('')
    setSaving(true)

    const payload = {
      name: form.name,
      assetType: form.assetType,
      purchaseDate: form.purchaseDate,
      purchasePrice: Number(form.purchasePrice),
      usefulLifeMonths: Number(form.usefulLifeMonths),
      salvageValue: Number(form.salvageValue || 0),
      serialNumber: form.serialNumber || null,
      location: form.location || null,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        const res = await fetch(`/api/assets/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
        const updated = await res.json()
        setAssets(prev => prev.map(a => a.id === editing.id ? updated : a))
      } else {
        const res = await fetch('/api/assets', {
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
        setAssets(prev => [created, ...prev])
      }
      setModalOpen(false)
    } catch {
      setFormError('Error de conexión. Intente de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/assets/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== deleteTarget.id))
      }
      setDeleteTarget(null)
    } catch {
      console.error('Error deleting asset')
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'
  const labelClass = 'text-xs font-medium text-muted-foreground'

  const getDepreciationPercent = (a: Asset) => {
    if (a.purchasePrice <= 0) return 0
    return Math.min(100, (a.accumulatedDepreciation / (a.purchasePrice - a.salvageValue)) * 100)
  }

  if (loading) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-28 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-card rounded-xl border border-border animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activos Fijos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Control de activos y depreciación</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nuevo activo
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor total</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor neto</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-blue">{formatCurrency(totalNetBook)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Depreciación acum.</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-warning">{formatCurrency(totalDepreciation)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activos activos</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{activeCount}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold">Registro de activos</h2>
        </div>
        <div className="divide-y divide-border">
          {assets.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Box size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin activos registrados</p>
              <p className="text-xs text-muted-foreground mt-1">Registra tu primer activo para controlar depreciación</p>
              <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
                Nuevo activo
              </button>
            </div>
          ) : (
            assets.map((asset) => {
              const depPercent = getDepreciationPercent(asset)
              return (
                <div key={asset.id} className="px-5 py-4 hover:bg-muted/40 transition-colors duration-150">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue/[0.08] flex items-center justify-center shrink-0">
                      <Box size={15} className="text-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{asset.name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          asset.status === 'active' ? 'bg-success/[0.08] text-success' :
                          asset.status === 'inactive' ? 'bg-muted text-muted-foreground' :
                          'bg-danger/[0.08] text-danger'
                        }`}>
                          {assetStatusOptions.find(s => s.id === asset.status)?.label || asset.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{assetTypeOptions.find(t => t.id === asset.assetType)?.label || asset.assetType}</span>
                        {asset.serialNumber && <><span className="text-muted-foreground/40">·</span><span>S/N: {asset.serialNumber}</span></>}
                        {asset.location && <><span className="text-muted-foreground/40">·</span><span>{asset.location}</span></>}
                      </div>
                      <div className="mt-2 max-w-xs">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground">Depreciación</span>
                          <span className="font-medium tabular-nums">{depPercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-warning/60 rounded-full transition-all" style={{ width: `${depPercent}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(asset.purchasePrice)}</p>
                      <p className="text-xs text-blue tabular-nums">Neto: {formatCurrency(asset.netBookValue)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(asset.purchaseDate)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(asset)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(asset)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Editar activo' : 'Nuevo activo'}
          subtitle={editing ? 'Actualizar datos del activo' : 'Registrar un nuevo activo fijo'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelClass}>Nombre *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre del activo"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Tipo *</label>
                <select
                  value={form.assetType}
                  onChange={(e) => setForm({ ...form, assetType: e.target.value })}
                  className={inputClass}
                >
                  {assetTypeOptions.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className={labelClass}>Fecha compra *</label>
                <input
                  type="date"
                  required
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Valor compra *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Vida útil (meses) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.usefulLifeMonths}
                  onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })}
                  className={inputClass}
                  placeholder="60"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className={labelClass}>Valor residual</label>
                <input
                  type="number"
                  min="0"
                  value={form.salvageValue}
                  onChange={(e) => setForm({ ...form, salvageValue: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>No. Serie</label>
                <input
                  type="text"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Número de serie"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Ubicación</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={inputClass}
                  placeholder="Ubicación física"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass + ' min-h-[64px] resize-none'}
                placeholder="Notas adicionales..."
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              {formError && (<p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{formError}</p>)}
              <button
                type="submit"
                disabled={saving || !form.name || !form.purchasePrice || !form.usefulLifeMonths}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                {editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar activo"
          message={`¿Seguro que deseas eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
