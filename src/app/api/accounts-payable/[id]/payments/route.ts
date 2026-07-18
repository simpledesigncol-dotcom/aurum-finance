import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { getDefaultRegisterId } from '@/lib/registers'

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
    const { amount, paymentDate, paymentMethodId, sourceType, sourceId, notes } = body

    if (!amount) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: amount' },
        { status: 400 }
      )
    }

    const ap = await prisma.accountsPayable.findUnique({ where: { id } })
    if (!ap) {
      return NextResponse.json(
        { error: 'Cuenta por pagar no encontrada' },
        { status: 404 }
      )
    }

    const transactionId = await generateTransactionId()
    const payDate = paymentDate ? new Date(paymentDate) : new Date()
    const srcType = sourceType || 'cash_register'
    const srcId = sourceId || (srcType === 'cash_register' ? await getDefaultRegisterId() : sourceId)

    const movement = await prisma.financialMovement.create({
      data: {
        transactionId,
        companyId: ap.companyId,
        movementType: 'expense',
        amount,
        direction: 'out',
        movementDate: payDate,
        sourceType: srcType,
        sourceId: srcId,
        contactId: ap.contactId,
        description: `Pago cuenta por pagar: ${ap.description}`,
        notes: notes || null,
        createdBy: 'default-user',
      },
    })

    const payment = await prisma.apPayment.create({
      data: {
        accountsPayableId: id,
        amount,
        paymentMethodId: paymentMethodId || null,
        paymentDate: payDate,
        financialMovementId: movement.id,
        notes: notes || null,
        createdBy: 'default-user',
      },
      include: {
        paymentMethod: true,
      },
    })

    const newPaidAmount = ap.paidAmount + amount
    const newBalance = ap.originalAmount - newPaidAmount

    await prisma.accountsPayable.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        balance: Math.max(0, newBalance),
        status: newBalance <= 0 ? 'paid' : ap.status,
      },
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
