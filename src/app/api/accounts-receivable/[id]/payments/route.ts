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
    const payments = await prisma.arPayment.findMany({
      where: { accountsReceivableId: id },
      orderBy: { paymentDate: 'desc' },
      include: {
        paymentMethod: true,
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching AR payments:', error)
    return NextResponse.json(
      { error: 'Error al obtener los pagos de la cuenta por cobrar' },
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
    const { amount, paymentDate, paymentMethodId, notes, sourceType, sourceId, paymentType } = body

    if (amount === undefined || amount === null || amount === '' || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }
    const parsedAmount = parseFloat(amount)

    const ar = await prisma.accountsReceivable.findUnique({ where: { id } })
    if (!ar) {
      return NextResponse.json(
        { error: 'Cuenta por cobrar no encontrada' },
        { status: 404 }
      )
    }

    if (parsedAmount > ar.balance) {
      return NextResponse.json(
        { error: `El pago excede el saldo pendiente (${ar.balance})` },
        { status: 400 }
      )
    }

    const companyId = ar.companyId
    const createdBy = body.createdBy || 'default-user'
    const { sourceType: resolvedSourceType, sourceId: resolvedSourceId } = await resolvePaymentSource(
      paymentType || 'cash',
      companyId,
      sourceType,
      sourceId
    )

    const transactionId = await generateTransactionId()
    const parsedDate = paymentDate ? new Date(paymentDate) : new Date()

    const payment = await prisma.$transaction(async (tx) => {
      const movement = await tx.financialMovement.create({
        data: {
          transactionId,
          companyId,
          status: 'confirmed',
          movementType: 'ar_payment',
          amount: parsedAmount,
          direction: 'in',
          occurredAt: parsedDate,
          movementDate: parsedDate,
          sourceType: resolvedSourceType,
          sourceId: resolvedSourceId,
          contactId: ar.contactId,
          workOrderId: ar.workOrderId || null,
          description: `Pago cuenta por cobrar: ${ar.description}`,
          referenceType: 'accounts_receivable',
          referenceId: ar.id,
          createdBy,
        },
      })

      const created = await tx.arPayment.create({
        data: {
          accountsReceivableId: id,
          amount: parsedAmount,
          paymentMethodId: paymentMethodId || null,
          paymentDate: parsedDate,
          financialMovementId: movement.id,
          notes: notes || null,
          createdBy,
        },
        include: {
          paymentMethod: true,
        },
      })

      const newPaidAmount = ar.paidAmount + parsedAmount
      const newBalance = Math.max(0, ar.originalAmount - newPaidAmount)
      const newStatus = newBalance <= 0 ? 'paid' : 'partial'

      await tx.accountsReceivable.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        },
      })

      return created
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating AR payment:', error)
    return NextResponse.json(
      { error: 'Error al registrar el pago de la cuenta por cobrar' },
      { status: 500 }
    )
  }
}
