export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ShieldCheck, User, FileText, Settings, DollarSign, ShoppingBag, Receipt, Package, CreditCard, Scale, Building2, ArrowRight } from 'lucide-react'

async function getAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
    },
  })

  return logs
}

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
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Creó',
  update: 'Editó',
  delete: 'Eliminó',
}

function formatDiff(log: { action: string; oldValues: string | null; newValues: string | null }): { title: string; details: { field: string; from?: string; to?: string }[] } {
  if (log.action === 'delete' && log.oldValues) {
    try {
      const data = JSON.parse(log.oldValues)
      const desc = data.description || data.name || data.movementType || data.bankName || ''
      const amount = data.amount || data.originalAmount || data.total || ''
      return {
        title: desc ? desc + (amount ? ' · ' + formatCurrency(amount) : '') : '',
        details: [],
      }
    } catch { return { title: '', details: [] } }
  }

  if (log.action === 'update' && log.oldValues && log.newValues) {
    try {
      const oldData = JSON.parse(log.oldValues)
      const newData = JSON.parse(log.newValues)
      const changes: { field: string; from?: string; to?: string }[] = []
      const skipFields = ['id', 'createdAt', 'updatedAt', 'companyId', 'createdBy', 'transactionId']
      for (const key of Object.keys(newData)) {
        if (skipFields.includes(key)) continue
        const oldVal = oldData[key]
        const newVal = newData[key]
        if (String(oldVal) !== String(newVal)) {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase()).trim()
          changes.push({
            field: label,
            from: oldVal != null && oldVal !== '' ? formatValue(key, oldVal) : undefined,
            to: formatValue(key, newVal),
          })
        }
      }
      const desc = newData.description || newData.name || newData.movementType || ''
      return { title: desc || '', details: changes }
    } catch { return { title: '', details: [] } }
  }

  if (log.action === 'create' && log.newValues) {
    try {
      const data = JSON.parse(log.newValues)
      const desc = data.description || data.name || data.movementType || data.bankName || ''
      const amount = data.amount || data.originalAmount || data.total || ''
      const contact = data.contactName || data.contact?.name || ''
      const fields: { field: string; to?: string }[] = []
      if (amount) fields.push({ field: 'Monto', to: formatCurrency(amount) })
      if (contact) fields.push({ field: 'Contacto', to: contact })
      return {
        title: desc ? desc + (amount ? ' · ' + formatCurrency(amount) : '') : '',
        details: fields,
      }
    } catch { return { title: '', details: [] } }
  }

  return { title: '', details: [] }
}

function formatValue(key: string, value: unknown): string {
  if (key.includes('Date') || key.includes('date') || key === 'movementDate' || key === 'startDate' || key === 'endDate' || key === 'issueDate' || key === 'dueDate' || key === 'paymentDate' || key === 'saleDate' || key === 'expenseDate' || key === 'purchaseDate') {
    if (typeof value === 'string') return new Date(value).toLocaleDateString('es-CO')
    return String(value || '')
  }
  if (key.includes('Amount') || key.includes('amount') || key.includes('Price') || key.includes('Total') || key.includes('total') || key.includes('Balance') || key.includes('balance') || key === 'originalAmount' || key === 'paidAmount') {
    if (typeof value === 'number') return formatCurrency(value)
    if (typeof value === 'string' && !isNaN(Number(value))) return formatCurrency(Number(value))
    return String(value || '')
  }
  if (value == null || value === '') return '—'
  return String(value)
}

export default async function AuditPage() {
  const logs = await getAuditLogs()

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Registro detallado de actividad del sistema</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Actividad reciente</h2>
          <span className="text-xs text-muted-foreground">{logs.length} registros</span>
        </div>
        <div className="divide-y divide-border">
          {logs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin registros de auditoría</p>
              <p className="text-xs text-muted-foreground mt-0.5">Las acciones se registrarán automáticamente</p>
            </div>
          ) : (
            logs.map((log) => {
              const Icon = ENTITY_ICONS[log.entityType] || ShieldCheck
              const actionColor = log.action === 'create' ? 'text-success' : log.action === 'delete' ? 'text-danger' : 'text-warning'
              const diff = formatDiff(log)
              return (
                <div key={log.id} className="px-5 py-3 hover:bg-muted/40 transition-colors duration-150">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${actionColor.replace('text-', 'bg-')}/[0.08]`}>
                      <Icon size={14} className={actionColor} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          <span className={actionColor}>{ACTION_LABELS[log.action] || log.action}</span>
                          {' '}
                          <span className="text-muted-foreground">{ENTITY_LABELS[log.entityType] || log.entityType.replace('_', ' ')}</span>
                        </p>
                        <p className="text-xs text-muted-foreground shrink-0">{formatDateTime(log.createdAt)}</p>
                      </div>
                      {diff.title && (
                        <p className="text-xs text-foreground mt-0.5 truncate">{diff.title}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground">{log.user?.name || 'Sistema'}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/50">#{log.entityId.slice(0, 6)}</span>
                      </div>
                      {diff.details.length > 0 && (
                        <div className="mt-2 ml-1 space-y-1">
                          {diff.details.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <span className="text-muted-foreground min-w-[80px]">{d.field}:</span>
                              {d.from !== undefined ? (
                                <>
                                  <span className="text-danger/70 line-through">{d.from}</span>
                                  <ArrowRight size={10} className="text-muted-foreground/40 shrink-0" />
                                  <span className="text-success/80">{d.to}</span>
                                </>
                              ) : (
                                <span className="text-foreground/80">{d.to}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
