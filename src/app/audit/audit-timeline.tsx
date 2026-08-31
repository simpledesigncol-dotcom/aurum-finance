'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DollarSign, ShoppingBag, Receipt, Package, CreditCard, Scale,
  Building2, User, FileText, Settings, ArrowRight, ChevronDown,
  ArrowDownLeft, ArrowUpRight, ShieldCheck, ArrowLeftRight,
  Wallet, Clock, Globe,
} from 'lucide-react'
import type { AuditLogData } from './page'

const ENTITY_ICONS: Record<string, React.ElementType> = {
  financial_movement: DollarSign,
  sale: ShoppingBag,
  expense: Receipt,
  purchase: Package,
  obligation: Scale,
  user: User,
  accounts_receivable: CreditCard,
  accounts_payable: CreditCard,
  bank_account: Building2,
  contact: User,
  document: FileText,
  work_order: Settings,
  transfer: ArrowLeftRight,
  cash_register: Wallet,
}

const ENTITY_LABELS: Record<string, string> = {
  financial_movement: 'Movimiento',
  sale: 'Venta',
  expense: 'Gasto',
  purchase: 'Compra',
  obligation: 'Obligación',
  user: 'Usuario',
  accounts_receivable: 'CxC',
  accounts_payable: 'CxP',
  bank_account: 'Cuenta bancaria',
  contact: 'Contacto',
  document: 'Documento',
  work_order: 'Orden de trabajo',
  transfer: 'Transferencia',
  cash_register: 'Caja',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Creó',
  update: 'Modificó',
  delete: 'Eliminó',
}

const MOVEMENT_LABELS: Record<string, string> = {
  sale: 'Venta',
  expense: 'Gasto',
  purchase: 'Compra',
  income: 'Ingreso',
  transfer: 'Transferencia',
  obligation_received: 'Préstamo recibido',
  obligation_payment: 'Pago de deuda',
  ar_payment: 'Cobro CxC',
  ap_payment: 'Pago CxP',
  capital_contribution: 'Aporte de capital',
  adjustment: 'Ajuste',
}

const ACTION_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  create: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  update: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
  delete: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
}

const DIRECTION_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  in: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  out: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
}

const ENTITY_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'financial_movement', label: 'Movimientos' },
  { id: 'sale', label: 'Ventas' },
  { id: 'expense', label: 'Gastos' },
  { id: 'purchase', label: 'Compras' },
  { id: 'accounts_receivable', label: 'CxC' },
  { id: 'accounts_payable', label: 'CxP' },
  { id: 'obligation', label: 'Obligaciones' },
  { id: 'work_order', label: 'Órdenes' },
  { id: 'transfer', label: 'Transferencias' },
]

const ACTION_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'create', label: 'Creaciones' },
  { id: 'update', label: 'Modificaciones' },
  { id: 'delete', label: 'Eliminaciones' },
]

function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Hoy'
  if (isYesterday(date)) return 'Ayer'
  return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es })
}

function parseJsonSafe(json: string | null): Record<string, unknown> | null {
  if (!json) return null
  try { return JSON.parse(json) } catch { return null }
}

function formatValue(key: string, value: unknown): string {
  if (value == null || value === '') return '—'
  const dateKeys = ['Date', 'date', 'Date', 'movementDate', 'startDate', 'endDate',
    'issueDate', 'dueDate', 'paymentDate', 'saleDate', 'expenseDate', 'purchaseDate',
    'occurredAt', 'createdAt', 'updatedAt', 'nextDueDate']
  if (dateKeys.some(k => key.includes(k))) {
    try {
      const d = typeof value === 'string' ? parseISO(value) : new Date(value as string)
      return format(d, "d 'de' MMM yyyy 'a las' h:mm a", { locale: es })
    } catch { return String(value) }
  }
  const amountKeys = ['Amount', 'amount', 'Price', 'price', 'Total', 'total',
    'Balance', 'balance', 'Cost', 'cost', 'Value', 'value', 'Rate', 'rate',
    'originalAmount', 'paidAmount', 'amountDue', 'amountPaid']
  if (amountKeys.some(k => key.includes(k))) {
    if (typeof value === 'number') return formatCurrency(value)
    if (typeof value === 'string' && !isNaN(Number(value))) return formatCurrency(Number(value))
  }
  return String(value)
}

function getEntityDescription(log: AuditLogData): string {
  const newVals = parseJsonSafe(log.newValues)
  const oldVals = parseJsonSafe(log.oldValues)

  if (log.entityType === 'financial_movement') {
    const data = newVals || oldVals
    if (data) {
      const dir = data.direction === 'in' ? 'Ingreso' : data.direction === 'out' ? 'Egreso' : ''
      const type = MOVEMENT_LABELS[String(data.movementType)] || String(data.movementType || '')
      const desc = String(data.description || '')
      const amount = data.amount ? ` · ${formatCurrency(Number(data.amount))}` : ''
      return `${dir ? dir + ' — ' : ''}${type}${desc ? ': ' + desc : ''}${amount}`
    }
  }

  if (log.entityType === 'sale') {
    const data = newVals || oldVals
    if (data?.total) return `Venta por ${formatCurrency(Number(data.total))}`
    if (data?.description) return String(data.description)
  }

  if (log.entityType === 'expense') {
    const data = newVals || oldVals
    if (data?.amount) return `Gasto por ${formatCurrency(Number(data.amount))}`
    if (data?.description) return String(data.description)
  }

  if (log.entityType === 'purchase') {
    const data = newVals || oldVals
    if (data?.total) return `Compra por ${formatCurrency(Number(data.total))}`
    if (data?.description) return String(data.description)
  }

  if (log.entityType === 'accounts_receivable' || log.entityType === 'accounts_payable') {
    const data = newVals || oldVals
    if (data?.description && data?.originalAmount) {
      return `${data.description} · ${formatCurrency(Number(data.originalAmount))}`
    }
    if (data?.description) return String(data.description)
  }

  if (log.entityType === 'obligation') {
    const data = newVals || oldVals
    if (data?.name) return String(data.name)
  }

  if (log.entityType === 'work_order') {
    const data = newVals || oldVals
    if (data?.orderNumber) return `OT ${data.orderNumber}`
    if (data?.description) return String(data.description)
  }

  if (log.entityType === 'transfer') {
    const data = newVals || oldVals
    if (data?.amount) return `Transferencia de ${formatCurrency(Number(data.amount))}`
  }

  if (log.entityType === 'contact') {
    const data = newVals || oldVals
    if (data?.name) return String(data.name)
  }

  if (log.entityType === 'bank_account') {
    const data = newVals || oldVals
    if (data?.bankName) return String(data.bankName)
  }

  if (log.entityType === 'cash_register') {
    const data = newVals || oldVals
    if (data?.name) return String(data.name)
  }

  return ''
}

function getDiffDetails(log: AuditLogData): { field: string; from?: string; to?: string }[] {
  const oldVals = parseJsonSafe(log.oldValues)
  const newVals = parseJsonSafe(log.newValues)

  if (log.action === 'delete' && oldVals) {
    return []
  }

  if (log.action === 'create' && newVals) {
    const importantFields = ['amount', 'total', 'originalAmount', 'balance', 'description', 'name',
      'bankName', 'movementType', 'status', 'paymentType', 'direction', 'sourceType', 'contactName']
    const details: { field: string; to?: string }[] = []
    for (const key of importantFields) {
      if (newVals[key] != null && newVals[key] !== '') {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
          .replace(/^./, s => s.toUpperCase()).trim()
        details.push({ field: label, to: formatValue(key, newVals[key]) })
      }
    }
    return details.slice(0, 5)
  }

  if (log.action === 'update' && oldVals && newVals) {
    const skipFields = ['id', 'createdAt', 'updatedAt', 'companyId', 'createdBy',
      'transactionId', 'reminderCount', 'agingBucket', 'metadata']
    const changes: { field: string; from?: string; to?: string }[] = []
    for (const key of Object.keys(newVals)) {
      if (skipFields.includes(key)) continue
      const oldVal = oldVals[key]
      const newVal = newVals[key]
      if (String(oldVal) !== String(newVal)) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
          .replace(/^./, s => s.toUpperCase()).trim()
        changes.push({
          field: label,
          from: oldVal != null && oldVal !== '' ? formatValue(key, oldVal) : undefined,
          to: formatValue(key, newVal),
        })
      }
    }
    return changes.slice(0, 8)
  }

  return []
}

export default function AuditTimeline({ logs, users }: { logs: AuditLogData[]; users: { id: string; name: string }[] }) {
  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = logs.filter(log => {
    if (entityFilter !== 'all' && log.entityType !== entityFilter) return false
    if (actionFilter !== 'all' && log.action !== actionFilter) return false
    if (userFilter !== 'all' && log.userId !== userFilter) return false
    return true
  })

  const grouped: { label: string; date: Date; items: AuditLogData[] }[] = []
  const seen = new Map<string, { label: string; date: Date; items: AuditLogData[] }>()

  for (const log of filtered) {
    const d = new Date(log.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (seen.has(key)) {
      seen.get(key)!.items.push(log)
    } else {
      const group = { label: getDayLabel(d), date: d, items: [log] }
      seen.set(key, group)
      grouped.push(group)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">Entidad:</span>
          {ENTITY_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setEntityFilter(f.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all duration-150 ${
                entityFilter === f.id
                  ? 'bg-foreground text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Acción:</span>
            {ACTION_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActionFilter(f.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all duration-150 ${
                  actionFilter === f.id
                    ? 'bg-foreground text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {users.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">Usuario:</span>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-muted text-foreground border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue/30"
              >
                <option value="all">Todos</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* ── Timeline ── */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No hay registros con estos filtros</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.label}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground">{group.items.length} evento{group.items.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Events */}
              <div className="relative ml-4 border-l-2 border-border/60 pl-6 space-y-1">
                {group.items.map((log, idx) => {
                  const Icon = ENTITY_ICONS[log.entityType] || ShieldCheck
                  let colors = ACTION_COLORS[log.action] || ACTION_COLORS.update
                  if (log.entityType === 'financial_movement') {
                    const data = parseJsonSafe(log.newValues) || parseJsonSafe(log.oldValues)
                    const dir = data?.direction as string | undefined
                    if (dir && DIRECTION_COLORS[dir]) colors = DIRECTION_COLORS[dir]
                  }
                  const description = getEntityDescription(log)
                  const diffDetails = getDiffDetails(log)
                  const isExpanded = expandedId === log.id
                  const logDate = new Date(log.createdAt)

                  return (
                    <div key={log.id} className="relative group">
                      {/* Dot on the line */}
                      <div className={`absolute -left-[31px] top-3.5 w-[10px] h-[10px] rounded-full border-2 border-white ${colors.dot} z-10`} />

                      {/* Card */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="w-full text-left bg-white rounded-xl border border-border p-4 hover:shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:border-border/80 transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                            <Icon size={16} className={colors.text} strokeWidth={1.8} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">
                                <span className={`font-medium ${colors.text}`}>
                                  {log.user?.name || 'Sistema'}
                                </span>
                                {' '}
                                <span className="text-muted-foreground font-normal">
                                  {ACTION_LABELS[log.action] || log.action} un(a)
                                </span>
                                {' '}
                                <span className="text-foreground font-normal">
                                  {(ENTITY_LABELS[log.entityType] || log.entityType.replace(/_/g, ' ')).toLowerCase()}
                                </span>
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock size={10} />
                                  {format(logDate, 'h:mm a', { locale: es })}
                                </span>
                                <ChevronDown
                                  size={14}
                                  className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </div>
                            </div>

                            {description && (
                              <p className="text-xs text-foreground mt-1 truncate">{description}</p>
                            )}

                            {/* Preview of changes */}
                            {!isExpanded && diffDetails.length > 0 && log.action === 'update' && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {diffDetails.slice(0, 2).map((d, i) => (
                                  <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {d.field}
                                    {d.from && d.to && (
                                      <>: <span className="line-through text-red-500/70">{d.from}</span> <ArrowRight size={8} className="inline" /> <span className="text-emerald-600/80">{d.to}</span></>
                                    )}
                                    {!d.from && d.to && (
                                      <>: <span className="text-emerald-600/80">{d.to}</span></>
                                    )}
                                  </span>
                                ))}
                                {diffDetails.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground">+{diffDetails.length - 2} más</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-2 bg-muted/50 rounded-xl border border-border p-4 ml-12 space-y-3 animate-slide-up">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Usuario</span>
                              <p className="font-medium mt-0.5">{log.user?.name || 'Sistema'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Fecha y hora</span>
                              <p className="font-medium mt-0.5">{format(logDate, "d 'de' MMMM yyyy, h:mm:ss a", { locale: es })}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Entidad</span>
                              <p className="font-medium mt-0.5">{ENTITY_LABELS[log.entityType] || log.entityType}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">ID</span>
                              <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{log.entityId.slice(0, 8)}…</p>
                            </div>
                            {log.ipAddress && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Globe size={10} /> Dirección IP
                                </span>
                                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{log.ipAddress}</p>
                              </div>
                            )}
                          </div>

                          {/* Visual diff */}
                          {diffDetails.length > 0 && (
                            <div className="border-t border-border pt-3">
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                {log.action === 'create' ? 'Datos registrados' : log.action === 'delete' ? 'Datos eliminados' : 'Cambios realizados'}
                              </p>
                              <div className="space-y-1.5">
                                {diffDetails.map((d, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground min-w-[100px] shrink-0">{d.field}:</span>
                                    {d.from !== undefined && d.to !== undefined ? (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">{d.from}</span>
                                        <ArrowRight size={10} className="text-muted-foreground/50 shrink-0" />
                                        <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">{d.to}</span>
                                      </div>
                                    ) : d.to ? (
                                      <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">{d.to}</span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
