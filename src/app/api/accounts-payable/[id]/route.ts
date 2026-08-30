import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ap = await prisma.accountsPayable.findUnique({
      where: { id },
      include: {
        contact: true,
        purchase: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    if (!ap) {
      return NextResponse.json(
        { error: 'Cuenta por pagar no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(ap)
  } catch (error) {
    console.error('Error fetching accounts payable:', error)
    return NextResponse.json(
      { error: 'Error al obtener la cuenta por pagar' },
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

    const existing = await prisma.accountsPayable.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Cuenta por pagar no encontrada' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (body.contactId !== undefined) data.contactId = body.contactId
    if (body.description !== undefined) data.description = body.description
    if (body.issueDate !== undefined) data.issueDate = new Date(body.issueDate)
    if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate)
    if (body.status !== undefined) data.status = body.status
    if (body.agingBucket !== undefined) data.agingBucket = body.agingBucket
    if (body.notes !== undefined) data.notes = body.notes

    if (body.originalAmount !== undefined) {
      const newOriginal = parseFloat(body.originalAmount)
      const newBalance = Math.max(0, newOriginal - existing.paidAmount)
      data.originalAmount = newOriginal
      data.balance = newBalance
      data.status = newBalance <= 0 ? 'paid' : newBalance < newOriginal ? 'partial' : 'pending'
    }

    const ap = await prisma.accountsPayable.update({
      where: { id },
      data,
      include: {
        contact: true,
        purchase: true,
        payments: true,
      },
    })

    return NextResponse.json(ap)
  } catch (error) {
    console.error('Error updating accounts payable:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la cuenta por pagar' },
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
      const payments = await tx.apPayment.findMany({
        where: { accountsPayableId: id },
        select: { financialMovementId: true },
      })
      const movementIds = payments
        .map((p) => p.financialMovementId)
        .filter((v): v is string => Boolean(v))
      if (movementIds.length) {
        await tx.financialMovement.deleteMany({ where: { id: { in: movementIds } } })
      }
      await tx.apPayment.deleteMany({ where: { accountsPayableId: id } })
      await tx.accountsPayable.delete({ where: { id } })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting accounts payable:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la cuenta por pagar' },
      { status: 500 }
    )
  }
}
