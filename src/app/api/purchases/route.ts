import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { getDefaultRegisterId } from '@/lib/registers'

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
    const isPaid = paymentType === 'cash' || paymentType === 'transfer'
    const amountPaid = isPaid ? total : 0
    const balanceDue = total - amountPaid

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
        amountPaid,
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

    if (isPaid) {
      const transactionId = await generateTransactionId()
      const registerId = await getDefaultRegisterId()

      const movement = await prisma.financialMovement.create({
        data: {
          transactionId,
          companyId: 'default',
          status: 'confirmed',
          movementType: 'purchase',
          amount: total,
          direction: 'out',
          occurredAt: new Date(purchaseDate),
          movementDate: new Date(purchaseDate),
          description: `Compra #${purchase.id.slice(0, 8)}`,
          sourceType: 'cash_register',
          sourceId: registerId,
          contactId: contactId || null,
          referenceType: 'purchase',
          referenceId: purchase.id,
          createdBy: 'default-user',
        },
      })

      await prisma.purchasePayment.create({
        data: {
          purchaseId: purchase.id,
          amount: total,
          paymentDate: new Date(purchaseDate),
          financialMovementId: movement.id,
          createdBy: 'default-user',
        },
      })
    }

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase:', error)
    return NextResponse.json(
      { error: 'Error al crear la compra' },
      { status: 500 }
    )
  }
}
