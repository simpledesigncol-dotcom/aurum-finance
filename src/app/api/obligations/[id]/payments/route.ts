import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'

export const dynamic = 'force-dynamic'

async function getDefaultRegisterId(): Promise<string> {
  const register = await prisma.cashRegister.findFirst({ select: { id: true } })
  return register?.id || 'default'
}

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

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }

    const obligation = await prisma.obligation.findUnique({ where: { id } })
    if (!obligation) {
      return NextResponse.json(
        { error: 'Obligación no encontrada' },
        { status: 404 }
      )
    }

    if (amount > obligation.balance) {
      return NextResponse.json(
        { error: `El monto ($${amount}) excede el saldo pendiente ($${obligation.balance})` },
        { status: 400 }
      )
    }

    const transactionId = await generateTransactionId()
    const payDate = paymentDate ? new Date(paymentDate) : new Date()
    const registerId = sourceId || (sourceType === 'cash_register' ? await getDefaultRegisterId() : sourceId)

    const movement = await prisma.financialMovement.create({
      data: {
        transactionId,
        companyId: obligation.companyId,
        movementType: 'obligation_payment',
        amount,
        direction: 'out',
        movementDate: payDate,
        sourceType: sourceType || 'cash_register',
        sourceId: registerId || await getDefaultRegisterId(),
        contactId: obligation.contactId,
        description: `Pago: ${obligation.name}`,
        notes: notes || null,
        createdBy: 'default-user',
      },
    })

    const payment = await prisma.obligationPayment.create({
      data: {
        obligationId: id,
        dueDate: dueDate ? new Date(dueDate) : payDate,
        amountDue: amount,
        amountPaid: amount,
        paymentDate: payDate,
        status: 'paid',
        financialMovementId: movement.id,
        notes: notes || null,
      },
    })

    const newPaidAmount = obligation.paidAmount + amount
    const newBalance = obligation.originalAmount - newPaidAmount
    const isFullyPaid = newBalance <= 0

    let newStatus = obligation.status
    if (isFullyPaid) {
      newStatus = 'paid'
    }

    let nextDueDate = obligation.nextDueDate
    if (obligation.isRecurring && obligation.paymentFrequency && !isFullyPaid) {
      const current = obligation.nextDueDate || obligation.startDate
      const next = new Date(current)
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
      nextDueDate = next
    }

    await prisma.obligation.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        balance: Math.max(0, newBalance),
        status: newStatus,
        nextDueDate,
      },
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
