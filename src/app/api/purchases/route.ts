import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
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

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return NextResponse.json(
      { error: 'Error al obtener las compras' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { purchaseDate, purchaseType, items, paymentType, contactId, tax, notes } = body

    if (!purchaseDate || !purchaseType || !items || items.length === 0 || !paymentType) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: purchaseDate, purchaseType, items, paymentType' },
        { status: 400 }
      )
    }

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    )

    const total = subtotal + (tax || 0)
    const balanceDue = total

    const purchase = await prisma.purchase.create({
      data: {
        companyId: 'default',
        createdBy: 'default-user',
        purchaseDate: new Date(purchaseDate),
        purchaseType,
        paymentType,
        contactId: contactId || null,
        subtotal,
        tax: tax || 0,
        total,
        balanceDue,
        notes: notes || null,
        items: {
          create: items.map((item: { itemName: string; quantity: number; unitPrice: number }) => ({
            itemName: item.itemName,
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

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase:', error)
    return NextResponse.json(
      { error: 'Error al crear la compra' },
      { status: 500 }
    )
  }
}
