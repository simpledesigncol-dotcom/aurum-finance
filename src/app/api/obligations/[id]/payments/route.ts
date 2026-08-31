import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { resolvePaymentSource } from '@/lib/payment-sources'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payments = await prisma.obligationPayment.findMany({
      where: { obligationId: id },
      orderBy: { dueDate: 'desc' },
      include: { financialMovement: true },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching obligation payments:', error)
    return NextResponse.json(
      { error: 'Error al obtener los pagos de la obligación' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      amount,
      dueDate,
      paymentDate,
      paymentMethodId,
      sourceType,
      sourceId,
      notes,
    } = body

    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }
    const parsedAmount = parseFloat(amount)

    const obligation = await prisma.obligation.findUnique({ where: { id } })
    if (!obligation) {
      return NextResponse.json(
        { error: 'Obligación no encontrada' },
        { status: 404 }
      )
    }

    if (parsedAmount > obligation.balance) {
      return NextResponse.json(
        { error: `El monto ($${parsedAmount}) excede el saldo pendiente ($${obligation.balance})` },
        { status: 400 }
      )
    }

    const companyId = obligation.companyId
    const createdBy = body.createdBy || 'default-user'
    const { sourceType: resolvedSourceType, sourceId: resolvedSourceId } = await resolvePaymentSource(
      'cash',
      companyId,
      sourceType && sourceType !== 'cash_register' ? sourceType : sourceType || undefined,
      sourceId && sourceId !== 'default' ? sourceId : undefined
    )

    const transactionId = await generateTransactionId()
    const payDate = paymentDate ? new Date(paymentDate) : new Date()
    const nextDueDateCalc = dueDate ? new Date(dueDate) : payDate

    const payment = await prisma.$transaction(async (tx) => {
      const movement = await tx.financialMovement.create({
        data: {
          transactionId,
          companyId,
          movementType: 'obligation_payment',
          amount: parsedAmount,
          direction: 'out',
          occurredAt: payDate,
          movementDate: payDate,
          sourceType: resolvedSourceType,
          sourceId: resolvedSourceId,
          contactId: obligation.contactId,
          description: `Pago: ${obligation.name}`,
          referenceType: 'obligation',
          referenceId: obligation.id,
          notes: notes || null,
          createdBy,
        },
      })

      const created = await tx.obligationPayment.create({
        data: {
          obligationId: id,
          dueDate: nextDueDateCalc,
          amountDue: parsedAmount,
          amountPaid: parsedAmount,
          paymentDate: payDate,
          status: 'paid',
          financialMovementId: movement.id,
          notes: notes || null,
        },
      })

      const advanceCycle = (from: Date): Date => {
        const next = new Date(from)
        switch (obligation.paymentFrequency) {
          case 'weekly':
            next.setDate(next.getDate() + 7)
            break
          case 'biweekly':
            next.setDate(next.getDate() + 14)
            break
          case 'monthly':
            next.setMonth(next.getMonth() + 1)
            break
          case 'quarterly':
            next.setMonth(next.getMonth() + 3)
            break
          case 'semiannual':
            next.setMonth(next.getMonth() + 6)
            break
          case 'annual':
            next.setFullYear(next.getFullYear() + 1)
            break
        }
        return next
      }

      let updatePaidAmount = obligation.paidAmount + parsedAmount
      let updateBalance = obligation.originalAmount - updatePaidAmount
      let nextDueDate = obligation.nextDueDate
      let newStatus = obligation.status

      if (obligation.isRecurring && obligation.paymentFrequency) {
        const remaining = obligation.balance - parsedAmount
        if (remaining <= 0) {
          nextDueDate = advanceCycle(obligation.nextDueDate || obligation.startDate)
          updatePaidAmount = 0
          updateBalance = obligation.originalAmount
          newStatus = 'active'
        } else {
          updatePaidAmount = obligation.paidAmount + parsedAmount
          updateBalance = obligation.balance - parsedAmount
          newStatus = 'active'
        }
      } else if (updateBalance <= 0) {
        newStatus = 'paid'
      }

      await tx.obligation.update({
        where: { id },
        data: {
          paidAmount: updatePaidAmount,
          balance: Math.max(0, updateBalance),
          status: newStatus,
          nextDueDate,
        },
      })

      return created
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating obligation payment:', error)
    return NextResponse.json(
      { error: 'Error al registrar el pago de la obligación' },
      { status: 500 }
    )
  }
}
