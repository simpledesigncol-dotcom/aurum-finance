import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contact: true,
        items: {
          orderBy: { id: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    const total = sales.reduce((sum, s) => sum + s.total, 0)
    const count = sales.length
    const pendingAmount = sales.reduce((sum, s) => sum + s.balanceDue, 0)

    return NextResponse.json({ sales, stats: { total, count, pendingAmount } })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Error al obtener las ventas' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { saleDate, items, paymentType, contactId, discount, tax, notes } = body

    if (!saleDate || !items || items.length === 0 || !paymentType) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: saleDate, items, paymentType' },
        { status: 400 }
      )
    }

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    )

    const total = subtotal - (discount || 0) + (tax || 0)
    const balanceDue = total

    const sale = await prisma.sale.create({
      data: {
        companyId: 'default',
        createdBy: 'default-user',
        saleDate: new Date(saleDate),
        paymentType,
        contactId: contactId || null,
        subtotal,
        discount: discount || 0,
        tax: tax || 0,
        total,
        balanceDue,
        notes: notes || null,
        items: {
          create: items.map((item: { serviceName: string; quantity: number; unitPrice: number }) => ({
            serviceName: item.serviceName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        contact: true,
        items: true,
        payments: true,
      },
    })

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json(
      { error: 'Error al crear la venta' },
      { status: 500 }
    )
  }
}
