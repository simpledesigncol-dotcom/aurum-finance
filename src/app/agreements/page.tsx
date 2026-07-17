'use client'

import { useState, useEffect, useCallback } from 'react'
import { Handshake, Plus, Car, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface AgreementItem {
  id: string
  vehiclePlate: string
  vehicleInfo: string | null
  serviceType: string
  serviceDescription: string | null
  totalValue: number
  splitAurum: number
  splitContractor: number
  status: string
  thirdPartyNeeded: boolean
  thirdPartyCost: number | null
  notes: string | null
  createdAt: string
}

interface AgreementSettlement {
  id: string
  agreementItemId: string | null
  settlementDate: string
  amount: number
  direction: string
  paymentMethod: string | null
  reference: string | null
  notes: string | null
  createdAt: string
}

interface Agreement {
  id: string
  title: string
  description: string | null
  contractorName: string
  contractorIdNumber: string | null
  serviceTypes: string
  paintSplitAurum: number
  paintSplitContractor: number
  bodyworkSplitAurum: number
  status: string
  startDate: string
  endDate: string | null
  workSchedule: string | null
  paymentTerms: string | null
  notes: string | null
  items: AgreementItem[]
  settlements: AgreementSettlement[]
  totalItemValue: number
  totalAurumEarnings: number
  totalContractorEarnings: number
  netBalance: number
}

const emptyAgreementForm = {
  title: '',
  contractorName: '',
  contractorIdNumber: '',
  description: '',
  serviceTypes: ['pintura', 'latoneria'] as string[],
  paintSplitAurum: 40,
  paintSplitContractor: 60,
  bodyworkSplitAurum: 25,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  workSchedule: 'Lun-Vie 8am-5pm, Sab 8am-1pm',
  paymentTerms: '',
  notes: '',
}

const emptyItemForm = {
  vehiclePlate: '',
  vehicleInfo: '',
  serviceType: 'pintura',
  serviceDescription: '',
  totalValue: '',
  thirdPartyNeeded: false,
  thirdPartyCost: '',
  notes: '',
}

const emptySettlementForm = {
  agreementItemId: '',
  settlementDate: new Date().toISOString().split('T')[0],
  amount: '',
  direction: 'aurum_to_contractor',
  paymentMethod: '',
  reference: '',
  notes: '',
}

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150'

function statusLabel(s: string) {
  if (s === 'active') return 'Activo'
  if (s === 'suspended') return 'Suspendido'
  return 'Terminado'
}

function statusClasses(s: string) {
  if (s === 'active') return 'bg-success/[0.08] text-success'
  if (s === 'suspended') return 'bg-warning/[0.08] text-warning'
  return 'bg-muted text-muted-foreground'
}

function itemStatusLabel(s: string) {
  if (s === 'paid') return 'Pagado'
  if (s === 'in_progress') return 'En proceso'
  if (s === 'completed') return 'Completado'
  if (s === 'invoiced') return 'Facturado'
  return 'Pendiente'
}

function itemStatusClasses(s: string) {
  if (s === 'paid') return 'bg-success/[0.08] text-success'
  if (s === 'in_progress') return 'bg-warning/[0.08] text-warning'
  if (s === 'completed') return 'bg-info/[0.08] text-info'
  return 'bg-muted text-muted-foreground'
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null)
  const [form, setForm] = useState(emptyAgreementForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Agreement | null>(null)

  const [itemModalAgreementId, setItemModalAgreementId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [savingItem, setSavingItem] = useState(false)

  const [settlementModalAgreementId, setSettlementModalAgreementId] = useState<string | null>(null)
  const [settlementForm, setSettlementForm] = useState(emptySettlementForm)
  const [savingSettlement, setSavingSettlement] = useState(false)

  const fetchAgreements = useCallback(async () => {
    try {
      const res = await fetch('/api/agreements')
      const data = await res.json()
      setAgreements(data)
    } catch {
      console.error('Error fetching agreements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAgreements() }, [fetchAgreements])

  const activeAgreements = agreements.filter(a => a.status === 'active')
  const totalValue = agreements.reduce((sum, a) => sum + a.totalItemValue, 0)
  const totalAurum = agreements.reduce((sum, a) => sum + a.totalAurumEarnings, 0)
  const pendingItems = agreements.reduce((sum, a) =>
    sum + a.items.filter(i => i.status !== 'paid').length, 0
  )

  const openCreate = () => {
    setEditingAgreement(null)
    setForm(emptyAgreementForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (ag: Agreement) => {
    setEditingAgreement(ag)
    setForm({
      title: ag.title,
      contractorName: ag.contractorName,
      contractorIdNumber: ag.contractorIdNumber || '',
      description: ag.description || '',
      serviceTypes: JSON.parse(ag.serviceTypes || '["pintura","latoneria"]'),
      paintSplitAurum: ag.paintSplitAurum,
      paintSplitContractor: ag.paintSplitContractor,
      bodyworkSplitAurum: ag.bodyworkSplitAurum,
      startDate: ag.startDate.split('T')[0],
      endDate: ag.endDate ? ag.endDate.split('T')[0] : '',
      workSchedule: ag.workSchedule || '',
      paymentTerms: ag.paymentTerms || '',
      notes: ag.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleAgreementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.contractorName.trim()) return
    setFormError('')
    setSaving(true)

    const payload = {
      title: form.title,
      contractorName: form.contractorName,
      contractorIdNumber: form.contractorIdNumber || null,
      description: form.description || null,
      serviceTypes: form.serviceTypes,
      paintSplitAurum: form.paintSplitAurum,
      paintSplitContractor: form.paintSplitContractor,
      bodyworkSplitAurum: form.bodyworkSplitAurum,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      workSchedule: form.workSchedule || null,
      paymentTerms: form.paymentTerms || null,
      notes: form.notes || null,
      createdBy: 'default-user',
    }

    try {
      if (editingAgreement) {
        const res = await fetch(`/api/agreements/${editingAgreement.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: payload.title,
            description: payload.description,
            status: editingAgreement.status,
            endDate: payload.endDate,
            notes: payload.notes,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
          setFormError(err.error || `Error ${res.status}`)
          return
        }
      } else {
        const res = await fetch('/api/agreements', {
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
      fetchAgreements()
    } catch {
      setFormError('Error de conexion. Intente de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/agreements/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchAgreements()
    } catch {
      console.error('Error deleting agreement')
    }
  }

  const openItemModal = (agreementId: string) => {
    setItemModalAgreementId(agreementId)
    setItemForm(emptyItemForm)
  }

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemModalAgreementId || !itemForm.vehiclePlate.trim() || !itemForm.totalValue) return
    setSavingItem(true)

    try {
      await fetch(`/api/agreements/${itemModalAgreementId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiclePlate: itemForm.vehiclePlate,
          vehicleInfo: itemForm.vehicleInfo || null,
          serviceType: itemForm.serviceType,
          serviceDescription: itemForm.serviceDescription || null,
          totalValue: parseFloat(itemForm.totalValue),
          thirdPartyNeeded: itemForm.thirdPartyNeeded,
          thirdPartyCost: itemForm.thirdPartyCost ? parseFloat(itemForm.thirdPartyCost) : null,
          notes: itemForm.notes || null,
          createdBy: 'default-user',
        }),
      })
      setItemModalAgreementId(null)
      fetchAgreements()
    } catch {
      console.error('Error creating item')
    } finally {
      setSavingItem(false)
    }
  }

  const openSettlementModal = (agreementId: string) => {
    setSettlementModalAgreementId(agreementId)
    setSettlementForm(emptySettlementForm)
  }

  const handleSettlementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settlementModalAgreementId || !settlementForm.amount) return
    setSavingSettlement(true)

    try {
      await fetch(`/api/agreements/${settlementModalAgreementId}/settlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementItemId: settlementForm.agreementItemId || null,
          settlementDate: settlementForm.settlementDate || null,
          amount: parseFloat(settlementForm.amount),
          direction: settlementForm.direction,
          paymentMethod: settlementForm.paymentMethod || null,
          reference: settlementForm.reference || null,
          notes: settlementForm.notes || null,
          createdBy: 'default-user',
        }),
      })
      setSettlementModalAgreementId(null)
      fetchAgreements()
    } catch {
      console.error('Error creating settlement')
    } finally {
      setSavingSettlement(false)
    }
  }

  const pendingItemsForSettlement = agreements
    .find(a => a.id === settlementModalAgreementId)
    ?.items.filter(i => i.status !== 'paid') || []

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Acuerdos Comerciales</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestion de contratos y splits de ingresos</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors">
          <Plus size={14} strokeWidth={1.8} />
          Nuevo acuerdo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Acuerdos activos</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{activeAgreements.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor total trabajos</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aurum earnings</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-success">{formatCurrency(totalAurum)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trabajos pendientes</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight text-warning">{pendingItems}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        </div>
      ) : agreements.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-5 py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Handshake size={18} className="text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium">Sin acuerdos comerciales</p>
            <p className="text-xs text-muted-foreground mt-1">Crea tu primer acuerdo para empezar a rastrear</p>
            <button onClick={openCreate} className="mt-3 text-xs text-blue font-medium hover:underline">
              Crear primer acuerdo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {agreements.map((agreement) => {
            const isExpanded = expandedId === agreement.id
            return (
              <div key={agreement.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${statusClasses(agreement.status)}`}>
                        <Handshake size={16} strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{agreement.title}</h3>
                        <p className="text-xs text-muted-foreground">{agreement.contractorName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusClasses(agreement.status)}`}>
                        {statusLabel(agreement.status)}
                      </span>
                      <button onClick={() => openEdit(agreement)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(agreement)} className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Split pintura</span>
                    <p className="font-medium mt-0.5">{agreement.paintSplitAurum}% Aurum / {agreement.paintSplitContractor}% Contratista</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Split latoneria</span>
                    <p className="font-medium mt-0.5">{agreement.bodyworkSplitAurum}% Aurum</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Inicio</span>
                    <p className="font-medium mt-0.5">{formatDate(agreement.startDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Horario</span>
                    <p className="font-medium mt-0.5">{agreement.workSchedule || 'Lun-Vie 8am-5pm, Sab 8am-1pm'}</p>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-border grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-muted/40 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Total trabajos</span>
                    <p className="text-sm font-semibold tabular-nums">{agreement.items.length}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Valor total</span>
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(agreement.totalItemValue)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Aurum</span>
                    <p className="text-sm font-semibold tabular-nums text-success">{formatCurrency(agreement.totalAurumEarnings)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Contratista</span>
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(agreement.totalContractorEarnings)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Saldo neto</span>
                    <p className={`text-sm font-semibold tabular-nums ${agreement.netBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(agreement.netBalance)}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-2.5 border-t border-border flex items-center gap-2 flex-wrap">
                  <button onClick={() => openItemModal(agreement.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors">
                    <Car size={13} strokeWidth={1.8} />
                    Agregar trabajo
                  </button>
                  <button onClick={() => openSettlementModal(agreement.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 transition-colors">
                    Registrar abono
                  </button>
                  {(agreement.items.length > 0 || agreement.settlements.length > 0) && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : agreement.id)}
                      className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-border">
                    {agreement.items.length > 0 && (
                      <div>
                        <div className="px-5 py-2.5 bg-muted/30">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trabajos</h4>
                        </div>
                        <div className="divide-y divide-border">
                          {agreement.items.map((item) => (
                            <div key={item.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                item.serviceType === 'pintura' ? 'bg-blue-500/[0.08] text-blue-600' : 'bg-orange-500/[0.08] text-orange-600'
                              }`}>
                                <Car size={13} strokeWidth={1.8} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{item.vehiclePlate} — {item.serviceType === 'pintura' ? 'Pintura' : 'Latoneria'}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{item.vehicleInfo || item.serviceDescription || 'Sin descripcion'}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-semibold tabular-nums">{formatCurrency(item.totalValue)}</p>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${itemStatusClasses(item.status)}`}>
                                  {itemStatusLabel(item.status)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {agreement.settlements.length > 0 && (
                      <div>
                        <div className="px-5 py-2.5 bg-muted/30 border-t border-border">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abonos</h4>
                        </div>
                        <div className="divide-y divide-border">
                          {agreement.settlements.map((s) => (
                            <div key={s.id} className="px-5 py-2.5 flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                s.direction === 'contractor_to_aurum' ? 'bg-success/[0.08] text-success' : 'bg-danger/[0.08] text-danger'
                              }`}>
                                <ChevronDown size={13} strokeWidth={1.8} className={s.direction === 'contractor_to_aurum' ? 'rotate-0' : 'rotate-180'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">
                                  {s.direction === 'contractor_to_aurum' ? 'Contratista → Aurum' : 'Aurum → Contratista'}
                                </p>
                                <p className="text-[11px] text-muted-foreground">{formatDate(s.settlementDate)}{s.paymentMethod ? ` · ${s.paymentMethod}` : ''}</p>
                              </div>
                              <p className="text-xs font-semibold tabular-nums">{formatCurrency(s.amount)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {agreement.items.length === 0 && agreement.settlements.length === 0 && (
                      <div className="px-5 py-8 text-center">
                        <p className="text-xs text-muted-foreground">Sin registros todavia</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingAgreement ? 'Editar acuerdo' : 'Nuevo acuerdo'}
          subtitle={editingAgreement ? 'Actualizar datos del acuerdo' : 'Crear un nuevo acuerdo comercial'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleAgreementSubmit} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Titulo *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                placeholder="Nombre del acuerdo"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Contratista *</label>
                <input
                  type="text"
                  required
                  value={form.contractorName}
                  onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre del contratista"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Cedula / NIT</label>
                <input
                  type="text"
                  value={form.contractorIdNumber}
                  onChange={(e) => setForm({ ...form, contractorIdNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Numero de documento"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Descripcion</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClass + ' min-h-[60px] resize-none'}
                placeholder="Descripcion del acuerdo..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Tipos de servicio</label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.serviceTypes.includes('pintura')}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...form.serviceTypes, 'pintura']
                        : form.serviceTypes.filter(t => t !== 'pintura')
                      setForm({ ...form, serviceTypes: types })
                    }}
                    className="rounded border-border"
                  />
                  Pintura
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.serviceTypes.includes('latoneria')}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...form.serviceTypes, 'latoneria']
                        : form.serviceTypes.filter(t => t !== 'latoneria')
                      setForm({ ...form, serviceTypes: types })
                    }}
                    className="rounded border-border"
                  />
                  Latoneria
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Split pintura Aurum %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.paintSplitAurum}
                  onChange={(e) => setForm({ ...form, paintSplitAurum: Number(e.target.value), paintSplitContractor: 100 - Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Split pintura Contratista %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.paintSplitContractor}
                  readOnly
                  className={inputClass + ' opacity-60'}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Split latoneria Aurum %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.bodyworkSplitAurum}
                  onChange={(e) => setForm({ ...form, bodyworkSplitAurum: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha inicio *</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha fin</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Horario</label>
              <input
                type="text"
                value={form.workSchedule}
                onChange={(e) => setForm({ ...form, workSchedule: e.target.value })}
                className={inputClass}
                placeholder="Lun-Vie 8am-5pm, Sab 8am-1pm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Terminos de pago</label>
              <input
                type="text"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className={inputClass}
                placeholder="Ej: Pago quincenal"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass + ' min-h-[60px] resize-none'}
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
                disabled={saving || !form.title.trim() || !form.contractorName.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue text-white hover:bg-blue/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingAgreement ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {itemModalAgreementId && (
        <Modal
          title="Agregar trabajo"
          subtitle="Registrar un nuevo trabajo en el acuerdo"
          onClose={() => setItemModalAgreementId(null)}
        >
          <form onSubmit={handleItemSubmit} className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Placa vehiculo *</label>
                <input
                  type="text"
                  required
                  value={itemForm.vehiclePlate}
                  onChange={(e) => setItemForm({ ...itemForm, vehiclePlate: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: ABC123"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Info vehiculo</label>
                <input
                  type="text"
                  value={itemForm.vehicleInfo}
                  onChange={(e) => setItemForm({ ...itemForm, vehicleInfo: e.target.value })}
                  className={inputClass}
                  placeholder="Marca, modelo, color..."
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Tipo de servicio *</label>
              <select
                value={itemForm.serviceType}
                onChange={(e) => setItemForm({ ...itemForm, serviceType: e.target.value })}
                className={inputClass}
              >
                <option value="pintura">Pintura</option>
                <option value="latoneria">Latoneria</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Descripcion del servicio</label>
              <textarea
                value={itemForm.serviceDescription}
                onChange={(e) => setItemForm({ ...itemForm, serviceDescription: e.target.value })}
                className={inputClass + ' min-h-[60px] resize-none'}
                placeholder="Detalle del trabajo..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Valor total *</label>
              <input
                type="number"
                required
                min="0"
                value={itemForm.totalValue}
                onChange={(e) => setItemForm({ ...itemForm, totalValue: e.target.value })}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemForm.thirdPartyNeeded}
                  onChange={(e) => setItemForm({ ...itemForm, thirdPartyNeeded: e.target.checked })}
                  className="rounded border-border"
                />
                Requiere terceros
              </label>
            </div>
            {itemForm.thirdPartyNeeded && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Costo terceros</label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.thirdPartyCost}
                  onChange={(e) => setItemForm({ ...itemForm, thirdPartyCost: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Notas</label>
              <input
                type="text"
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                className={inputClass}
                placeholder="Notas adicionales..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setItemModalAgreementId(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingItem || !itemForm.vehiclePlate.trim() || !itemForm.totalValue}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue text-white hover:bg-blue/90 transition-colors disabled:opacity-50"
              >
                {savingItem ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {settlementModalAgreementId && (
        <Modal
          title="Registrar abono"
          subtitle="Registrar un movimiento de pago entre Aurum y el contratista"
          onClose={() => setSettlementModalAgreementId(null)}
        >
          <form onSubmit={handleSettlementSubmit} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Trabajo asociado (opcional)</label>
              <select
                value={settlementForm.agreementItemId}
                onChange={(e) => setSettlementForm({ ...settlementForm, agreementItemId: e.target.value })}
                className={inputClass}
              >
                <option value="">Sin asociar a trabajo</option>
                {pendingItemsForSettlement.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.vehiclePlate} — {item.serviceType === 'pintura' ? 'Pintura' : 'Latoneria'} ({formatCurrency(item.totalValue)})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha *</label>
                <input
                  type="date"
                  required
                  value={settlementForm.settlementDate}
                  onChange={(e) => setSettlementForm({ ...settlementForm, settlementDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Monto *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Direccion *</label>
              <select
                value={settlementForm.direction}
                onChange={(e) => setSettlementForm({ ...settlementForm, direction: e.target.value })}
                className={inputClass}
              >
                <option value="aurum_to_contractor">Aurum → Contratista</option>
                <option value="contractor_to_aurum">Contratista → Aurum</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Metodo de pago</label>
                <input
                  type="text"
                  value={settlementForm.paymentMethod}
                  onChange={(e) => setSettlementForm({ ...settlementForm, paymentMethod: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: Transferencia"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Referencia</label>
                <input
                  type="text"
                  value={settlementForm.reference}
                  onChange={(e) => setSettlementForm({ ...settlementForm, reference: e.target.value })}
                  className={inputClass}
                  placeholder="Numero de referencia"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Notas</label>
              <input
                type="text"
                value={settlementForm.notes}
                onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                className={inputClass}
                placeholder="Notas adicionales..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSettlementModalAgreementId(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingSettlement || !settlementForm.amount}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue text-white hover:bg-blue/90 transition-colors disabled:opacity-50"
              >
                {savingSettlement ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar acuerdo"
          message={`¿Seguro que deseas eliminar "${deleteTarget.title}"? Esta accion eliminara todos los trabajos y abonos asociados y no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
