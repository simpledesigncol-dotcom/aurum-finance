import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SearchResult {
  id: string
  type: string
  title: string
  subtitle: string
  url: string
  amount?: number
  date?: string
  status?: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], total: 0 })
    }

    const term = `%${query}%`
  const results: SearchResult[] = []

  const [movements, sales, expenses, purchases, contacts, obligations, ars, aps, documents, workOrders] = await Promise.all([
    prisma.financialMovement.findMany({
      where: {
        OR: [
          { description: { contains: query, mode: 'insensitive' as const } },
          { transactionId: { contains: query, mode: 'insensitive' as const } },
          { notes: { contains: query, mode: 'insensitive' as const } },
          { receiptNumber: { contains: query, mode: 'insensitive' as const } },
        ],
      },
      take: 10,
      orderBy: { movementDate: 'desc' },
    }),

    prisma.sale.findMany({
      where: {
        OR: [
          { notes: { contains: query, mode: 'insensitive' as const } },
          { contact: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      take: 5,
      include: { contact: true },
      orderBy: { saleDate: 'desc' },
    }),

    prisma.expense.findMany({
      where: {
        OR: [
          { description: { contains: query, mode: 'insensitive' as const } },
          { receiptNumber: { contains: query, mode: 'insensitive' as const } },
        ],
      },
      take: 5,
      orderBy: { expenseDate: 'desc' },
    }),

    prisma.purchase.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: query, mode: 'insensitive' as const } },
          { notes: { contains: query, mode: 'insensitive' as const } },
          { contact: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      take: 5,
      include: { contact: true },
      orderBy: { purchaseDate: 'desc' },
    }),

    prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
          { documentNumber: { contains: query, mode: 'insensitive' as const } },
          { phone: { contains: query, mode: 'insensitive' as const } },
        ],
      },
      take: 5,
    }),

    prisma.obligation.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { notes: { contains: query, mode: 'insensitive' as const } },
          { contact: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      take: 5,
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.accountsReceivable.findMany({
      where: {
        OR: [
          { description: { contains: query, mode: 'insensitive' as const } },
          { contact: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      take: 5,
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.accountsPayable.findMany({
      where: {
        OR: [
          { description: { contains: query, mode: 'insensitive' as const } },
          { contact: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      take: 5,
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.document.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { tags: { contains: query, mode: 'insensitive' as const } },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),

    prisma.workOrder.findMany({
      where: {
        OR: [
          { orderNumber: { contains: query, mode: 'insensitive' as const } },
          { vehiclePlate: { contains: query, mode: 'insensitive' as const } },
          { vehicleInfo: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
          { contact: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      take: 5,
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  movements.forEach(m => results.push({
    id: m.id,
    type: 'movement',
    title: m.transactionId,
    subtitle: m.description || m.movementType,
    url: `/cash`,
    amount: Number(m.amount),
    date: m.movementDate.toISOString(),
    status: m.status,
  }))

  sales.forEach(s => results.push({
    id: s.id,
    type: 'sale',
    title: `Venta · ${s.contact?.name || 'Directa'}`,
    subtitle: `${s.paymentType}`,
    url: `/sales`,
    amount: Number(s.total),
    date: s.saleDate.toISOString(),
    status: s.status,
  }))

  expenses.forEach(e => results.push({
    id: e.id,
    type: 'expense',
    title: e.description || 'Gasto',
    subtitle: e.receiptNumber || '',
    url: `/expenses`,
    amount: Number(e.amount),
    date: e.expenseDate.toISOString(),
  }))

  purchases.forEach(p => results.push({
    id: p.id,
    type: 'purchase',
    title: `Compra · ${p.contact?.name || p.invoiceNumber || ''}`,
    subtitle: p.purchaseType,
    url: `/purchases`,
    amount: Number(p.total),
    date: p.purchaseDate.toISOString(),
  }))

  contacts.forEach(c => results.push({
    id: c.id,
    type: 'contact',
    title: c.name,
    subtitle: `${c.type} · ${c.email || c.phone || c.documentNumber || ''}`,
    url: `/suppliers`,
  }))

  obligations.forEach(o => results.push({
    id: o.id,
    type: 'obligation',
    title: o.name,
    subtitle: o.type,
    url: `/obligations`,
    amount: Number(o.balance),
    status: o.status,
  }))

  ars.forEach(a => results.push({
    id: a.id,
    type: 'receivable',
    title: `CxC · ${a.contact?.name || a.description}`,
    subtitle: 'Cuenta por cobrar',
    url: `/receivables`,
    amount: Number(a.balance),
    status: a.status,
  }))

  aps.forEach(a => results.push({
    id: a.id,
    type: 'payable',
    title: `CxP · ${a.contact?.name || a.description}`,
    subtitle: 'Cuenta por pagar',
    url: `/payables`,
    amount: Number(a.balance),
    status: a.status,
  }))

  documents.forEach(d => results.push({
    id: d.id,
    type: 'document',
    title: d.name,
    subtitle: d.documentType,
    url: `/documents`,
  }))

  workOrders.forEach(wo => results.push({
    id: wo.id,
    type: 'work_order',
    title: `${wo.orderNumber} · ${wo.vehicleInfo || wo.vehiclePlate || 'Sin vehículo'}`,
    subtitle: wo.contact?.name || wo.description || wo.status,
    url: `/work-orders/${wo.id}`,
    amount: Number(wo.saleAmount),
    status: wo.status,
  }))

  return NextResponse.json({
    results: results.slice(0, 20),
    total: results.length,
  })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json(
      { error: 'Error al buscar' },
      { status: 500 }
    )
  }
}
