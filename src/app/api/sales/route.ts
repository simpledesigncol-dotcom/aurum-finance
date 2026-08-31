import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { resolvePaymentSource, isFullyPaidPaymentType } from '@/lib/payment-sources'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
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

async function resolveOrCreateContact(name: string | null | undefined, companyId: string): Promise<string | null> {
  if (!name) return null

  const existing = await prisma.contact.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' as const },
      companyId,
    },
    select: { id: true },
  })
  if (existing) return existing.id

  const contact = await prisma.contact.create({
    data: { name, type: 'client', companyId },
  })
  return contact.id
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      saleDate,
      items,
      paymentType,
      contactId,
      contactName,
      discount,
      tax,
      notes,
      paymentMethodId,
      workOrderId,
    } = body

    if (!saleDate || !items || items.length === 0 || !paymentType) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: saleDate, items, paymentType' },
        { status: 400 }
      )
    }

    const companyId = body.companyId || 'default'
    const createdBy = body.createdBy || 'default-user'
    const resolvedContactId = contactId || (await resolveOrCreateContact(contactName, companyId))

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    )

    const total = subtotal - (discount || 0) + (tax || 0)
    const paid = isFullyPaidPaymentType(paymentType)
    const amountPaid = paid ? total : 0
    const balanceDue = total - amountPaid
    const status = paid ? 'completed' : 'pending'

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          companyId,
          createdBy,
          saleDate: new Date(saleDate),
          paymentType,
          contactId: resolvedContactId,
          workOrderId: workOrderId || null,
          subtotal,
          discount: discount || 0,
          tax: tax || 0,
          total,
          amountPaid,
          balanceDue,
          status,
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

      if (paid) {
        const transactionId = await generateTransactionId()
        const { sourceType, sourceId } = await resolvePaymentSource(paymentType, companyId)

        const movement = await tx.financialMovement.create({
          data: {
            transactionId,
            companyId,
            status: 'confirmed',
            movementType: 'sale',
            amount: total,
            direction: 'in',
            occurredAt: new Date(saleDate),
            movementDate: new Date(saleDate),
            description: `Venta ${created.id.slice(0, 8)}`,
            sourceType,
            sourceId,
            contactId: resolvedContactId,
            workOrderId: workOrderId || null,
            referenceType: 'sale',
            referenceId: created.id,
            metadata: JSON.stringify({ paymentType }),
            createdBy,
          },
        })

        await tx.salePayment.create({
          data: {
            saleId: created.id,
            amount: total,
            paymentMethodId: paymentMethodId || null,
            paymentDate: new Date(saleDate),
            financialMovementId: movement.id,
            createdBy,
          },
        })
      }

      return created
    })

    // If the sale was unpaid/credit, create the corresponding account receivable
    if (!paid) {
      try {
        if (resolvedContactId) {
          await prisma.accountsReceivable.create({
            data: {
              companyId,
              contactId: resolvedContactId,
              saleId: sale.id,
              workOrderId: workOrderId || null,
              description: `Venta ${sale.id.slice(0, 8)}`,
              originalAmount: total,
              balance: total,
              issueDate: new Date(saleDate),
              dueDate: new Date(saleDate),
            },
          })
        }
      } catch (e) {
        console.error('Error creating AR for credit sale:', e)
      }
    }

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    const message = error instanceof Error ? error.message : ''
    if (message.includes('bancaria')) {
      return NextResponse.json(
        { error: 'Para registrar una venta pagan con método digital (Nequi, tarjeta, transferencia...) debes tener una cuenta bancaria configurada. Crea la cuenta en el módulo de Bancos y vuelve a intentar.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al crear la venta' },
      { status: 500 }
    )
  }
}
