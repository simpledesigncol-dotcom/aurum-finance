import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { DollarSign, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

interface TimelineProps {
  entityType: string
  entityId: string
}

interface TimelineEvent {
  id: string
  date: Date
  type: string
  title: string
  subtitle: string
  amount?: number
  direction?: 'in' | 'out'
  icon: React.ElementType
}

export default async function EntityTimeline({ entityType, entityId }: TimelineProps) {
  const events = await getTimelineEvents(entityType, entityId)

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-0">
        {events.length === 0 ? (
          <div className="py-8 text-center relative">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center mx-auto relative z-10">
              <FileText size={13} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Sin eventos registrados</p>
          </div>
        ) : (
          events.map((event) => {
            const Icon = event.icon
            return (
              <div key={event.id} className="relative pl-8 py-2.5">
                <div className={`absolute left-2 top-3.5 w-2 h-2 rounded-full border-[1.5px] bg-background ${
                  event.direction === 'in' ? 'border-success/60' :
                  event.direction === 'out' ? 'border-danger/60' :
                  'border-muted-foreground/30'
                }`} />

                <div className="bg-card rounded-xl border border-border p-3 hover:shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        event.direction === 'in' ? 'bg-success/[0.08] text-success' :
                        event.direction === 'out' ? 'bg-danger/[0.08] text-danger' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        <Icon size={12} strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{event.title}</p>
                        <p className="text-[11px] text-muted-foreground">{event.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {event.amount != null && (
                        <p className={`text-xs font-semibold tabular-nums ${
                          event.direction === 'in' ? 'text-success' :
                          event.direction === 'out' ? 'text-danger' :
                          ''
                        }`}>
                          {event.direction === 'in' ? '+' :
                           event.direction === 'out' ? '-' : ''}
                          {formatCurrency(event.amount)}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(event.date)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

async function getTimelineEvents(
  entityType: string,
  entityId: string
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = []

  if (entityType === 'contact') {
    const [movements, sales, purchases, ars, aps, obligations, documents] = await Promise.all([
      prisma.financialMovement.findMany({
        where: { contactId: entityId },
        orderBy: { movementDate: 'desc' },
        take: 20,
      }),
      prisma.sale.findMany({
        where: { contactId: entityId },
        orderBy: { saleDate: 'desc' },
        take: 10,
        include: { items: true },
      }),
      prisma.purchase.findMany({
        where: { contactId: entityId },
        orderBy: { purchaseDate: 'desc' },
        take: 10,
      }),
      prisma.accountsReceivable.findMany({
        where: { contactId: entityId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.accountsPayable.findMany({
        where: { contactId: entityId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.obligation.findMany({
        where: { contactId: entityId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.document.findMany({
        where: { referenceType: 'contact', referenceId: entityId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    movements.forEach(m => events.push({
      id: m.id,
      date: m.movementDate,
      type: 'movement',
      title: m.description || m.movementType,
      subtitle: m.transactionId,
      amount: Number(m.amount),
      direction: m.direction as 'in' | 'out',
      icon: m.direction === 'in' ? ArrowDownLeft : ArrowUpRight,
    }))

    sales.forEach(s => events.push({
      id: s.id,
      date: s.saleDate,
      type: 'sale',
      title: `Venta - ${s.paymentType}`,
      subtitle: `${s.items?.length || 0} servicio(s)`,
      amount: Number(s.total),
      direction: 'in',
      icon: DollarSign,
    }))

    purchases.forEach(p => events.push({
      id: p.id,
      date: p.purchaseDate,
      type: 'purchase',
      title: `Compra - ${p.purchaseType}`,
      subtitle: p.invoiceNumber || '',
      amount: Number(p.total),
      direction: 'out',
      icon: DollarSign,
    }))

    ars.forEach(a => events.push({
      id: a.id,
      date: a.issueDate,
      type: 'receivable',
      title: `CxC - ${a.description}`,
      subtitle: a.status,
      amount: Number(a.balance),
      direction: 'in',
      icon: ArrowDownLeft,
    }))

    aps.forEach(a => events.push({
      id: a.id,
      date: a.issueDate,
      type: 'payable',
      title: `CxP - ${a.description}`,
      subtitle: a.status,
      amount: Number(a.balance),
      direction: 'out',
      icon: ArrowUpRight,
    }))

    obligations.forEach(o => events.push({
      id: o.id,
      date: o.startDate,
      type: 'obligation',
      title: o.name,
      subtitle: o.type,
      amount: Number(o.originalAmount),
      icon: DollarSign,
    }))

    documents.forEach(d => events.push({
      id: d.id,
      date: d.createdAt,
      type: 'document',
      title: d.name,
      subtitle: d.documentType,
      icon: FileText,
    }))
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime())

  return events.slice(0, 30)
}
