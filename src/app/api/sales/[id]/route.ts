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
    const sale = await prisma.sale.findUnique({
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

    if (!sale) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Error fetching sale:', error)
    return NextResponse.json(
      { error: 'Error al obtener la venta' },
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

    const existing = await prisma.sale.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      )
    }

    const sale = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {}

      if (body.status !== undefined) data.status = body.status
      if (body.notes !== undefined) data.notes = body.notes
      if (body.contactId !== undefined) data.contactId = body.contactId || null

      // Recompute totals when tax / discount change
      let recomputeTotal = false
      const effectiveDiscount = body.discount !== undefined ? Number(body.discount) : existing.discount
      const effectiveTax = body.tax !== undefined ? Number(body.tax) : existing.tax
      if (body.discount !== undefined) data.discount = effectiveDiscount
      if (body.tax !== undefined) data.tax = effectiveTax

      const newTotal = existing.subtotal - effectiveDiscount + effectiveTax
      if (body.discount !== undefined || body.tax !== undefined) {
        if (newTotal !== existing.total) {
          recomputeTotal = true
          data.total = newTotal
        }
      }

      // Payment type transitions must reconcile the ledger
      const paymentTypeChanged = body.paymentType !== undefined && body.paymentType !== existing.paymentType
      if (body.paymentType !== undefined) data.paymentType = body.paymentType

      const wasPaid = isFullyPaidPaymentType(existing.paymentType)
      const newPaid = isFullyPaidPaymentType(body.paymentType !== undefined ? body.paymentType : existing.paymentType)
      const paidTransitioned = paymentTypeChanged && wasPaid !== newPaid

      if (paymentTypeChanged || recomputeTotal) {
        const companyId = existing.companyId
        const createdBy = body.createdBy || existing.createdBy || 'default-user'

        // Reverse any existing paid movement + payment
        if (wasPaid) {
          await tx.financialMovement.deleteMany({ where: { referenceType: 'sale', referenceId: id } })
          await tx.salePayment.deleteMany({ where: { saleId: id } })
        }

        if (newPaid) {
          const finalTotal = paymentTypeChanged ? newTotal : existing.total
          const transactionId = await generateTransactionId()
          const { sourceType, sourceId } = await resolvePaymentSource(body.paymentType || existing.paymentType, companyId)

          const movement = await tx.financialMovement.create({
            data: {
              transactionId,
              companyId,
              status: 'confirmed',
              movementType: 'sale',
              amount: finalTotal,
              direction: 'in',
              occurredAt: existing.saleDate,
              movementDate: existing.saleDate,
              description: `Venta ${id.slice(0, 8)}`,
              sourceType,
              sourceId,
              contactId: existing.contactId,
              workOrderId: existing.workOrderId || null,
              referenceType: 'sale',
              referenceId: id,
              createdBy,
            },
          })

          await tx.salePayment.create({
            data: {
              saleId: id,
              amount: finalTotal,
              paymentDate: existing.saleDate,
              financialMovementId: movement.id,
              createdBy,
            },
          })
        }

        data.amountPaid = newPaid ? (recomputeTotal || paymentTypeChanged ? newTotal : existing.total) : 0
        data.balanceDue = (recomputeTotal || paymentTypeChanged ? newTotal : existing.total) - (newPaid ? (recomputeTotal || paymentTypeChanged ? newTotal : existing.total) : 0)
        data.status = newPaid ? 'completed' : 'pending'
      }

      const updated = await tx.sale.update({
        where: { id },
        data,
        include: {
          contact: true,
          items: true,
          payments: true,
        },
      })

      return updated
    })

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Error updating sale:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la venta' },
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
      await tx.salePayment.deleteMany({ where: { saleId: id } })
      await tx.financialMovement.deleteMany({ where: { referenceType: 'sale', referenceId: id } })
      await tx.saleItem.deleteMany({ where: { saleId: id } })
      const linkedARs = await tx.accountsReceivable.findMany({ where: { saleId: id }, select: { id: true } })
      if (linkedARs.length) {
        const arIds = linkedARs.map((a) => a.id)
        await tx.arPayment.deleteMany({ where: { accountsReceivableId: { in: arIds } } })
        await tx.accountsReceivable.deleteMany({ where: { id: { in: arIds } } })
      }
      await tx.sale.delete({ where: { id } })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sale:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la venta' },
      { status: 500 }
    )
  }
}
