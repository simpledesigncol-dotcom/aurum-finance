import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { resolvePaymentSource, isFullyPaidPaymentType } from '@/lib/payment-sources'

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
    const { purchaseDate, purchaseType, items, paymentType, contactId, tax, notes, workOrderId } = body

    if (!purchaseDate || !purchaseType || !items || items.length === 0 || !paymentType) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: purchaseDate, purchaseType, items, paymentType' },
        { status: 400 }
      )
    }

    const companyId = body.companyId || 'default'
    const createdBy = body.createdBy || 'default-user'

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    )

    const total = subtotal + (tax || 0)
    const paid = isFullyPaidPaymentType(paymentType)
    const amountPaid = paid ? total : 0
    const balanceDue = total - amountPaid
    const status = paid ? 'completed' : 'pending'

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          companyId,
          createdBy,
          purchaseDate: new Date(purchaseDate),
          purchaseType,
          paymentType,
          contactId: contactId || null,
          workOrderId: workOrderId || null,
          subtotal,
          tax: tax || 0,
          total,
          amountPaid,
          balanceDue,
          status,
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

      if (paid) {
        const transactionId = await generateTransactionId()
        const { sourceType, sourceId } = await resolvePaymentSource(paymentType, companyId)

        const movement = await tx.financialMovement.create({
          data: {
            transactionId,
            companyId,
            status: 'confirmed',
            movementType: 'purchase',
            amount: total,
            direction: 'out',
            occurredAt: new Date(purchaseDate),
            movementDate: new Date(purchaseDate),
            description: `Compra ${created.id.slice(0, 8)}`,
            sourceType,
            sourceId,
            contactId: contactId || null,
            workOrderId: workOrderId || null,
            referenceType: 'purchase',
            referenceId: created.id,
            metadata: JSON.stringify({ paymentType }),
            createdBy,
          },
        })

        await tx.purchasePayment.create({
          data: {
            purchaseId: created.id,
            amount: total,
            paymentDate: new Date(purchaseDate),
            financialMovementId: movement.id,
            createdBy,
          },
        })
      }

      return created
    })

    // If unpaid/credit purchase, create the corresponding account payable
    if (!paid) {
      if (contactId) {
        try {
          await prisma.accountsPayable.create({
            data: {
              companyId,
              contactId,
              purchaseId: purchase.id,
              workOrderId: workOrderId || null,
              description: `Compra ${purchase.id.slice(0, 8)}`,
              originalAmount: total,
              balance: total,
              issueDate: new Date(purchaseDate),
              dueDate: new Date(purchaseDate),
            },
          })
        } catch (e) {
          console.error('Error creating AP for credit purchase:', e)
        }
      }
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
