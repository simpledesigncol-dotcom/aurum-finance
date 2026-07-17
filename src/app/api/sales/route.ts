import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { getDefaultRegisterId } from '@/lib/registers'

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
    const { saleDate, items, paymentType, contactId, discount, tax, notes, paymentMethodId } = body

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
    const isPaid = paymentType === 'cash' || paymentType === 'transfer'
    const amountPaid = isPaid ? total : 0
    const balanceDue = total - amountPaid

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
        amountPaid,
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

    if (isPaid) {
      const transactionId = await generateTransactionId()
      const registerId = await getDefaultRegisterId()

      const movement = await prisma.financialMovement.create({
        data: {
          transactionId,
          companyId: 'default',
          status: 'confirmed',
          movementType: 'sale',
          amount: total,
          direction: 'in',
          movementDate: new Date(saleDate),
          description: `Venta #${sale.id.slice(0, 8)}`,
          sourceType: 'cash_register',
          sourceId: registerId,
          contactId: contactId || null,
          referenceType: 'sale',
          referenceId: sale.id,
          createdBy: 'default-user',
        },
      })

      await prisma.salePayment.create({
        data: {
          saleId: sale.id,
          amount: total,
          paymentMethodId: paymentMethodId || null,
          paymentDate: new Date(saleDate),
          financialMovementId: movement.id,
          createdBy: 'default-user',
        },
      })
    }

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json(
      { error: 'Error al crear la venta' },
      { status: 500 }
    )
  }
}
