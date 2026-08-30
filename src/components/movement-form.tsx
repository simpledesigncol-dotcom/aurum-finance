'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowDownLeft, ArrowUpRight, Loader2, Check } from 'lucide-react'
import { EVENT_TYPES, PAYMENT_TYPES } from '@/lib/constants'

type EventType = (typeof EVENT_TYPES)[number]['id']

interface FormData {
  eventType: EventType | null
  amount: string
  description: string
  movementDate: string
  contactName: string
  paymentType: string
  notes: string
  status: string
  workOrderId: string
}

interface MovementFormProps {
  onClose?: () => void
  registerId?: string
}

export default function MovementForm({ onClose, registerId }: MovementFormProps) {
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null)
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [transactionId, setTransactionId] = useState('')
  const [resolvedRegisterId, setResolvedRegisterId] = useState<string | null>(registerId || null)
  const [workOrders, setWorkOrders] = useState<{ id: string; orderNumber: string; vehiclePlate?: string | null }[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!registerId) {
      fetch('/api/register/default')
        .then(res => res.json())
        .then(data => {
          if (data.registerId) setResolvedRegisterId(data.registerId)
        })
        .catch(() => {})
    }
    fetch('/api/work-orders?limit=100')
      .then(res => res.json())
      .then(data => setWorkOrders(data.orders || []))
      .catch(() => {})
  }, [registerId])

  const [form, setForm] = useState<FormData>({
    eventType: null,
    amount: '',
    description: '',
    movementDate: new Date().toISOString().split('T')[0],
    contactName: '',
    paymentType: 'cash',
    notes: '',
    status: 'confirmed',
    workOrderId: '',
  })

  const updateForm = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const selectEvent = (eventType: EventType) => {
    setSelectedEvent(eventType)
    updateForm('eventType', eventType)
    setStep('form')
  }

  const getDirection = (): 'in' | 'out' => {
    if (!selectedEvent) return 'out'
    const dir = EVENT_TYPES.find(e => e.id === selectedEvent)?.direction
    if (dir === 'out') return 'out'
    if (dir === 'transfer') return 'out'
    return 'in'
  }

  const getMovementType = (): string => {
    return selectedEvent || 'adjustment'
  }

  const getEventLabel = (): string => {
    return EVENT_TYPES.find(e => e.id === selectedEvent)?.label || ''
  }

  const handleClose = () => {
    setStep('pick')
    setSelectedEvent(null)
    setSuccess(false)
    setTransactionId('')
    onClose?.()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movementType: getMovementType(),
            amount: parseFloat(form.amount),
            direction: getDirection(),
            occurredAt: form.movementDate,
            movementDate: form.movementDate,
            description: form.description || getEventLabel(),
            contactName: form.contactName || null,
            paymentType: form.paymentType,
            notes: form.notes || null,
            createdBy: 'default-user',
            companyId: 'default',
            status: form.status,
            workOrderId: form.workOrderId || null,
          }),
        })

        if (!res.ok) throw new Error('Failed')

        const data = await res.json()
        setTransactionId(data.transactionId)
        setSuccess(true)
        setTimeout(() => {
          handleClose()
          setForm({
            eventType: null,
            amount: '',
            description: '',
            movementDate: new Date().toISOString().split('T')[0],
            contactName: '',
            paymentType: 'cash',
            notes: '',
            status: 'confirmed',
            workOrderId: '',
          })
          router.refresh()
        }, 2000)
      } catch (err) {
        console.error(err)
      }
    })
  }

  const selectedEventData = EVENT_TYPES.find(e => e.id === selectedEvent)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-card rounded-xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.12)] w-full max-w-md sm:mx-4 mx-2 max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-scale-in">
        {success && (
          <div className="absolute inset-0 z-10 bg-card flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-success/[0.08] flex items-center justify-center mb-4">
              <Check size={24} className="text-success" strokeWidth={2} />
            </div>
            <p className="text-base font-semibold">Movimiento registrado</p>
            <p className="text-xs font-mono text-muted-foreground mt-2 bg-muted px-3 py-1.5 rounded-lg">
              {transactionId}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Guardado correctamente</p>
          </div>
        )}

        {step === 'pick' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Registrar movimiento</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Que paso?</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {EVENT_TYPES.map((event) => (
                <button
                  key={event.id}
                  onClick={() => selectEvent(event.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-blue/40 hover:bg-muted/50 transition-all duration-150 group"
                >
                  <span className="text-xl">{event.icon}</span>
                  <span className="text-[11px] font-medium text-center leading-tight text-muted-foreground group-hover:text-foreground transition-colors">
                    {event.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && selectedEventData && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => setStep('pick')} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                  &larr;
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedEventData.icon}</span>
                  <div>
                    <h2 className="text-sm font-semibold">{selectedEventData.label}</h2>
                    <p className={`text-xs font-medium ${getDirection() === 'in' ? 'text-success' : 'text-danger'}`}>
                      {getDirection() === 'in' ? 'Dinero entra' : 'Dinero sale'}
                    </p>
                  </div>
                </div>
              </div>
              <button type="button" onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => updateForm('amount', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="100"
                  required
                  className="w-full pl-7 pr-4 py-2.5 text-xl font-bold tabular-nums rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Descripcion</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Ej: Lavado completo carro placa ABC123"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 placeholder:text-muted-foreground/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Orden de trabajo (opcional)</label>
              <select
                value={form.workOrderId}
                onChange={(e) => updateForm('workOrderId', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
              >
                <option value="">Sin OT</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>#{wo.orderNumber}{wo.vehiclePlate ? ` — ${wo.vehiclePlate}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Fecha</label>
                <input
                  type="date"
                  value={form.movementDate}
                  onChange={(e) => updateForm('movementDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Forma de pago</label>
                <select
                  value={form.paymentType}
                  onChange={(e) => updateForm('paymentType', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                >
                  {PAYMENT_TYPES.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.icon} {pt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Estado</label>
              <div className="flex gap-1.5">
                {[
                  { value: 'draft', label: 'Borrador', color: 'bg-muted text-muted-foreground' },
                  { value: 'pending', label: 'Pendiente', color: 'bg-warning/[0.08] text-warning' },
                  { value: 'confirmed', label: 'Confirmado', color: 'bg-success/[0.08] text-success' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => updateForm('status', s.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150 ${
                      form.status === s.value
                        ? `${s.color} border-current/20`
                        : 'border-border text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Contacto</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => updateForm('contactName', e.target.value)}
                placeholder="Nombre del contacto"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 placeholder:text-muted-foreground/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="Detalles adicionales..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 resize-none placeholder:text-muted-foreground/50"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !form.amount || parseFloat(form.amount) <= 0}
              className="w-full py-2.5 rounded-xl bg-blue text-white font-medium text-sm hover:bg-blue/90 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  {getDirection() === 'in' ? <ArrowDownLeft size={14} strokeWidth={1.8} /> : <ArrowUpRight size={14} strokeWidth={1.8} />}
                  Registrar {getDirection() === 'in' ? 'ingreso' : 'egreso'}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
