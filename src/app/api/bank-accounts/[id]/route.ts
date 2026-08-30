import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const account = await prisma.bankAccount.findUnique({
      where: { id },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Cuenta bancaria no encontrada' },
        { status: 404 }
      )
    }

    const incoming = await prisma.financialMovement.aggregate({
      where: { sourceType: 'bank_account', sourceId: id, direction: 'in', status: 'confirmed' },
      _sum: { amount: true },
    })
    const outgoing = await prisma.financialMovement.aggregate({
      where: { sourceType: 'bank_account', sourceId: id, direction: 'out', status: 'confirmed' },
      _sum: { amount: true },
    })

    return NextResponse.json({
      ...account,
      balance: (incoming._sum.amount || 0) - (outgoing._sum.amount || 0),
    })
  } catch (error) {
    console.error('Error fetching bank account:', error)
    return NextResponse.json(
      { error: 'Error al obtener la cuenta bancaria' },
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

    const account = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(body.bankName !== undefined && { bankName: body.bankName }),
        ...(body.accountType !== undefined && { accountType: body.accountType }),
        ...(body.accountNumber !== undefined && { accountNumber: body.accountNumber }),
        ...(body.holderName !== undefined && { holderName: body.holderName }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error updating bank account:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la cuenta bancaria' },
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
    await prisma.paymentMethod.updateMany({ where: { bankAccountId: id }, data: { bankAccountId: null } })
    await prisma.bankAccount.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bank account:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la cuenta bancaria' },
      { status: 500 }
    )
  }
}
