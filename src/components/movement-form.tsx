'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Loader2, Check } from 'lucide-react'
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

interface AccountOption {
  value: string
  label: string
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
  const [registerOption, setRegisterOption] = useState<AccountOption | null>(null)
  const [bankOptions, setBankOptions] = useState<AccountOption[]>([])
  const [fromAccount, setFromAccount] = useState('')
  const [toAccount, setToAccount] = useState('')
  const [account, setAccount] = useState('')
  const [accountError, setAccountError] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/register/default')
      .then(res => res.json())
      .then(data => {
        if (data.registerId) {
          if (!registerId) setResolvedRegisterId(data.registerId)
          setRegisterOption({ value: `cash_register:${data.registerId}`, label: `Caja — ${data.name || 'Principal'}` })
          if (!account) setAccount(`cash_register:${data.registerId}`)
        }
      })
      .catch(() => {})
    fetch('/api/bank-accounts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBankOptions(
            data.map((a: { id: string; bankName: string; accountNumber?: string | null }) => ({
              value: `bank_account:${a.id}`,
              label: a.bankName + (a.accountNumber ? ` — ${a.accountNumber}` : ''),
            }))
          )
        }
      })
      .catch(() => {})
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
    setSubmitError('')
  }

  const isTransfer = selectedEvent === 'transfer'

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
    setAccount('')
    setAccountError(false)
    onClose?.()
  }

  const canSubmit = (): boolean => {
    if (!form.amount || parseFloat(form.amount) <= 0) return false
    if (isTransfer) {
      return (
        !!fromAccount &&
        !!toAccount &&
        fromAccount !== toAccount &&
        fromAccount.split(':')[0] !== '' &&
        toAccount.split(':')[0] !== ''
      )
    }
    return !!account
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) {
      if (!isTransfer && !account) setAccountError(true)
      return
    }

    startTransition(async () => {
      try {
        if (isTransfer) {
          const from = fromAccount.split(':')
          const to = toAccount.split(':')
          const res = await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromType: from[0],
              fromId: from[1],
              toType: to[0],
              toId: to[1],
              amount: parseFloat(form.amount),
              transferDate: form.movementDate,
              description: form.description || null,
              notes: form.notes || null,
              status: form.status,
              createdBy: 'default-user',
              companyId: 'default',
            }),
          })
          if (!res.ok) throw new Error('Failed')

          const data = await res.json()
          setTransactionId(data.originMovement?.transactionId || '')
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
          return
        }

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
              sourceType: account.split(':')[0],
              sourceId: account.split(':')[1],
            }),
          })

          if (!res.ok) {
            const bodyErr = await res.json().catch(() => null)
            throw new Error(bodyErr?.detail || bodyErr?.error || `Error ${res.status}`)
          }

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
        setAccountError(false)
        setSubmitError(err instanceof Error ? err.message : 'Error al registrar el movimiento')
      }
    })
  }

  const selectedEventData = EVENT_TYPES.find(e => e.id === selectedEvent)
  const allOptions = [registerOption, ...bankOptions].filter((o): o is AccountOption => o !== null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-card rounded-xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.12)] w-full max-w-md sm:mx-4 mx-2 max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-scale-in">
        {success && (
          <div className="absolute inset-0 z-10 bg-card flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-success/[0.08] flex items-center justify-center mb-4">
              <Check size={24} className="text-success" strokeWidth={2} />
            </div>
            <p className="text-base font-semibold">{isTransfer ? 'Transferencia registrada' : 'Movimiento registrado'}</p>
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
                <p className="text-xs text-muted-foreground mt-0.5">Qué pasó?</p>
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
                    <p className={`text-xs font-medium ${isTransfer ? 'text-muted-foreground' : getDirection() === 'in' ? 'text-success' : 'text-danger'}`}>
                      {isTransfer ? 'Dinero se mueve entre cuentas' : getDirection() === 'in' ? 'Dinero entra' : 'Dinero sale'}
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
                  className="w-full pl-7 pr-4 py-2.5 text-xl font-bold tabular-nums rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder={isTransfer ? 'Ej: Traslado a cuenta bancaria' : 'Ej: Lavado completo carro placa ABC123'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 placeholder:text-muted-foreground/50"
              />
            </div>

            {!isTransfer && (
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Orden de trabajo (opcional)</label>
                <select
                  value={form.workOrderId}
                  onChange={(e) => updateForm('workOrderId', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                >
                  <option value="">Sin OT</option>
                  {workOrders.map(wo => (
                    <option key={wo.id} value={wo.id}>#{wo.orderNumber}{wo.vehiclePlate ? ` — ${wo.vehiclePlate}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Fecha</label>
                <input
                  type="date"
                  value={form.movementDate}
                  onChange={(e) => updateForm('movementDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                />
              </div>
              {!isTransfer && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Forma de pago</label>
                  <select
                    value={form.paymentType}
                    onChange={(e) => updateForm('paymentType', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                  >
                    {PAYMENT_TYPES.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.icon} {pt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!isTransfer && (
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                  Cuenta <span className="text-danger">*</span>
                </label>
                <select
                  value={account}
                  onChange={(e) => { setAccount(e.target.value); setAccountError(false) }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 ${
                    accountError ? 'border-danger' : 'border-border'
                  }`}
                >
                  <option value="">Selecciona caja o banco...</option>
                  {allOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {accountError && (
                  <p className="text-xs text-danger mt-1">Debes elegir a qué cuenta (caja o banco) va este movimiento.</p>
                )}
              </div>
            )}

            {isTransfer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Desde</label>
                  <select
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                  >
                    <option value="">Origen...</option>
                    {allOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Hacia</label>
                  <select
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
                  >
                    <option value="">Destino...</option>
                    {allOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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

            {!isTransfer && (
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Contacto</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => updateForm('contactName', e.target.value)}
                  placeholder="Nombre del contacto"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 placeholder:text-muted-foreground/50"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="Detalles adicionales..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150 resize-none placeholder:text-muted-foreground/50"
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-lg border border-danger/30 bg-danger/[0.06] text-danger text-xs leading-relaxed">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !canSubmit()}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {isTransfer ? 'Registrando transferencia...' : 'Registrando...'}
                </>
              ) : (
                <>
                  {isTransfer ? (
                    <ArrowRightLeft size={14} strokeWidth={1.8} />
                  ) : getDirection() === 'in' ? (
                    <ArrowDownLeft size={14} strokeWidth={1.8} />
                  ) : (
                    <ArrowUpRight size={14} strokeWidth={1.8} />
                  )}
                  {isTransfer ? 'Registrar transferencia' : getDirection() === 'in' ? 'Registrar ingreso' : 'Registrar egreso'}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}