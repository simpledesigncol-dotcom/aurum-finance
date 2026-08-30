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
    const payments = await prisma.apPayment.findMany({
      where: { accountsPayableId: id },
      orderBy: { paymentDate: 'desc' },
      include: {
        paymentMethod: true,
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching AP payments:', error)
    return NextResponse.json(
      { error: 'Error al obtener los pagos de la cuenta por pagar' },
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
    const { amount, paymentDate, paymentMethodId, sourceType, sourceId, notes, paymentType } = body

    if (amount === undefined || amount === null || amount === '' || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }
    const parsedAmount = parseFloat(amount)

    const ap = await prisma.accountsPayable.findUnique({ where: { id } })
    if (!ap) {
      return NextResponse.json(
        { error: 'Cuenta por pagar no encontrada' },
        { status: 404 }
      )
    }

    if (parsedAmount > ap.balance) {
      return NextResponse.json(
        { error: `El pago excede el saldo pendiente (${ap.balance})` },
        { status: 400 }
      )
    }

    const companyId = ap.companyId
    const createdBy = body.createdBy || 'default-user'
    const { sourceType: resolvedSourceType, sourceId: resolvedSourceId } = await resolvePaymentSource(
      paymentType || 'cash',
      companyId,
      sourceType,
      sourceId
    )

    const transactionId = await generateTransactionId()
    const payDate = paymentDate ? new Date(paymentDate) : new Date()

    const payment = await prisma.$transaction(async (tx) => {
      const movement = await tx.financialMovement.create({
        data: {
          transactionId,
          companyId,
          movementType: 'ap_payment',
          amount: parsedAmount,
          direction: 'out',
          occurredAt: payDate,
          movementDate: payDate,
          sourceType: resolvedSourceType,
          sourceId: resolvedSourceId,
          contactId: ap.contactId,
          workOrderId: ap.workOrderId || null,
          description: `Pago cuenta por pagar: ${ap.description}`,
          referenceType: 'accounts_payable',
          referenceId: ap.id,
          notes: notes || null,
          createdBy,
        },
      })

      const created = await tx.apPayment.create({
        data: {
          accountsPayableId: id,
          amount: parsedAmount,
          paymentMethodId: paymentMethodId || null,
          paymentDate: payDate,
          financialMovementId: movement.id,
          notes: notes || null,
          createdBy,
        },
        include: {
          paymentMethod: true,
        },
      })

      const newPaidAmount = ap.paidAmount + parsedAmount
      const newBalance = Math.max(0, ap.originalAmount - newPaidAmount)
      const newStatus = newBalance <= 0 ? 'paid' : 'partial'

      await tx.accountsPayable.update({
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
    console.error('Error creating AP payment:', error)
    return NextResponse.json(
      { error: 'Error al registrar el pago de la cuenta por pagar' },
      { status: 500 }
    )
  }
}
