import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'

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
    const { amount, paymentDate, paymentMethodId, notes } = body

    if (!amount) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: amount' },
        { status: 400 }
      )
    }

    const ar = await prisma.accountsReceivable.findUnique({ where: { id } })
    if (!ar) {
      return NextResponse.json(
        { error: 'Cuenta por cobrar no encontrada' },
        { status: 404 }
      )
    }

    const transactionId = await generateTransactionId()

    const movement = await prisma.financialMovement.create({
      data: {
        transactionId,
        companyId: ar.companyId,
        movementType: 'income',
        amount,
        direction: 'incoming',
        movementDate: paymentDate ? new Date(paymentDate) : new Date(),
        sourceType: 'accounts_receivable',
        sourceId: id,
        contactId: ar.contactId,
        description: `Pago cuenta por cobrar: ${ar.description}`,
        createdBy: 'default-user',
      },
    })

    const payment = await prisma.arPayment.create({
      data: {
        accountsReceivableId: id,
        amount,
        paymentMethodId: paymentMethodId || null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        financialMovementId: movement.id,
        notes: notes || null,
        createdBy: 'default-user',
      },
      include: {
        paymentMethod: true,
      },
    })

    const newPaidAmount = ar.paidAmount + amount
    const newBalance = ar.originalAmount - newPaidAmount

    await prisma.accountsReceivable.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        balance: Math.max(0, newBalance),
        status: newBalance <= 0 ? 'paid' : ar.status,
      },
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
