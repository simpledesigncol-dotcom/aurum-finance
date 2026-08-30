import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { resolvePaymentSource, isFullyPaidPaymentType } from '@/lib/payment-sources'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const purchase = await prisma.purchase.findUnique({
      where: { id },
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

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Error fetching purchase:', error)
    return NextResponse.json(
      { error: 'Error al obtener la compra' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    const companyId = existing.companyId
    const createdBy = existing.createdBy

    const subtotal = existing.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const newTax = body.tax !== undefined && body.tax !== null ? Number(body.tax) : existing.tax
    const newTotal = subtotal + newTax
    const newPaymentType = body.paymentType || existing.paymentType
    const newPaid = isFullyPaidPaymentType(newPaymentType)
    const wasPaid = isFullyPaidPaymentType(existing.paymentType)
    const newPurchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : existing.purchaseDate

    if (body.tax !== undefined && Number(body.tax) < 0) {
      return NextResponse.json(
        { error: 'El impuesto no puede ser negativo' },
        { status: 400 }
      )
    }

    const purchase = await prisma.$transaction(async (tx) => {
      if (newPaid) {
        // Paid: ensure a payment + movement exist and stay in sync
        const existingPayment = await tx.purchasePayment.findFirst({
          where: { purchaseId: id },
        })

        if (!existingPayment && !wasPaid) {
          const transactionId = await generateTransactionId()
          const { sourceType, sourceId } = await resolvePaymentSource(newPaymentType, companyId)
          const movement = await tx.financialMovement.create({
            data: {
              transactionId,
              companyId,
              status: 'confirmed',
              movementType: 'purchase',
              amount: newTotal,
              direction: 'out',
              occurredAt: newPurchaseDate,
              movementDate: newPurchaseDate,
              description: `Compra ${id.slice(0, 8)}`,
              sourceType,
              sourceId,
              contactId: body.contactId !== undefined ? body.contactId || null : existing.contactId,
              workOrderId: existing.workOrderId,
              referenceType: 'purchase',
              referenceId: id,
              createdBy,
            },
          })

          await tx.purchasePayment.create({
            data: {
              purchaseId: id,
              amount: newTotal,
              paymentDate: newPurchaseDate,
              financialMovementId: movement.id,
              createdBy,
            },
          })
        } else if (existingPayment) {
          // Sync existing movement/payment to new totals (tax/date edits)
          await tx.purchasePayment.update({
            where: { id: existingPayment.id },
            data: {
              amount: newTotal,
              paymentDate: newPurchaseDate,
            },
          })

          const movement = await tx.financialMovement.findFirst({
            where: { referenceType: 'purchase', referenceId: id },
          })
          if (movement) {
            await tx.financialMovement.update({
              where: { id: movement.id },
              data: {
                amount: newTotal,
                occurredAt: newPurchaseDate,
                movementDate: newPurchaseDate,
              },
            })
          }
        }

        // Switching credit -> paid: remove the linked AP (or settle it)
        const linkedAp = await tx.accountsPayable.findFirst({ where: { purchaseId: id } })
        if (linkedAp && !wasPaid) {
          const apPayments = await tx.apPayment.findMany({ where: { accountsPayableId: linkedAp.id } })
          if (apPayments.length === 0) {
            await tx.accountsPayable.delete({ where: { id: linkedAp.id } })
          } else {
            await tx.accountsPayable.update({
              where: { id: linkedAp.id },
              data: { status: 'paid', balance: 0, paidAmount: linkedAp.originalAmount },
            })
          }
        }
      } else {
        // Unpaid/credit: ensure no payment/movement remains, keep AP in sync
        const payments = await tx.purchasePayment.findMany({ where: { purchaseId: id } })
        const movementIds = payments
          .map((p) => p.financialMovementId)
          .filter((v): v is string => Boolean(v))
        if (movementIds.length) {
          await tx.financialMovement.deleteMany({ where: { id: { in: movementIds } } })
        }
        if (payments.length) {
          const activePaymentIds = payments.map((p) => p.id)
          await tx.purchasePayment.deleteMany({ where: { id: { in: activePaymentIds } } })
        }

        if (wasPaid) {
          // Paid -> credit: create AP if a contact is set
          const contactId = body.contactId !== undefined ? body.contactId || null : existing.contactId
          if (contactId) {
            await tx.accountsPayable.create({
              data: {
                companyId,
                contactId,
                purchaseId: id,
                workOrderId: existing.workOrderId,
                description: `Compra ${id.slice(0, 8)}`,
                originalAmount: newTotal,
                paidAmount: 0,
                balance: newTotal,
                issueDate: newPurchaseDate,
                dueDate: newPurchaseDate,
                status: 'pending',
              },
            })
          }
        } else {
          // Still credit: keep AP original/balance in sync with new totals
          const linkedAp = await tx.accountsPayable.findFirst({ where: { purchaseId: id } })
          if (linkedAp) {
            const delta = newTotal - linkedAp.originalAmount
            const newBalance = Math.max(0, linkedAp.balance + delta)
            const settled = newBalance <= 0
            await tx.accountsPayable.update({
              where: { id: linkedAp.id },
              data: {
                originalAmount: newTotal,
                balance: settled ? 0 : newBalance,
                issueDate: newPurchaseDate,
                dueDate: newPurchaseDate,
                status: settled ? 'paid' : 'pending',
              },
            })
          } else if (body.contactId) {
            const contactId = body.contactId || null
            if (contactId) {
              await tx.accountsPayable.create({
                data: {
                  companyId,
                  contactId,
                  purchaseId: id,
                  workOrderId: existing.workOrderId,
                  description: `Compra ${id.slice(0, 8)}`,
                  originalAmount: newTotal,
                  paidAmount: 0,
                  balance: newTotal,
                  issueDate: newPurchaseDate,
                  dueDate: newPurchaseDate,
                  status: 'pending',
                },
              })
            }
          }
        }
      }

      const amountPaid = newPaid ? newTotal : 0
      const balanceDue = Math.max(0, newTotal - amountPaid)

      return tx.purchase.update({
        where: { id },
        data: {
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.contactId !== undefined && { contactId: body.contactId || null }),
          ...(body.purchaseType !== undefined && { purchaseType: body.purchaseType }),
          ...(body.paymentType !== undefined && { paymentType: newPaymentType }),
          ...(body.invoiceNumber !== undefined && { invoiceNumber: body.invoiceNumber }),
          tax: newTax,
          total: newTotal,
          subtotal,
          amountPaid,
          balanceDue,
          status: newPaid ? 'completed' : 'pending',
        },
        include: {
          contact: true,
          items: true,
          payments: true,
        },
      })
    })

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Error updating purchase:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la compra' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.$transaction(async (tx) => {
      const linkedAp = await tx.accountsPayable.findFirst({ where: { purchaseId: id } })
      if (linkedAp) {
        const apPayments = await tx.apPayment.findMany({ where: { accountsPayableId: linkedAp.id } })
        const movementIds = apPayments
          .map((p) => p.financialMovementId)
          .filter((v): v is string => Boolean(v))
        if (movementIds.length) {
          await tx.financialMovement.deleteMany({ where: { id: { in: movementIds } } })
        }
        await tx.apPayment.deleteMany({ where: { accountsPayableId: linkedAp.id } })
        await tx.accountsPayable.delete({ where: { id: linkedAp.id } })
      }
      await tx.purchasePayment.deleteMany({ where: { purchaseId: id } })
      await tx.financialMovement.deleteMany({ where: { referenceType: 'purchase', referenceId: id } })
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } })
      await tx.purchase.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la compra' },
      { status: 500 }
    )
  }
}
