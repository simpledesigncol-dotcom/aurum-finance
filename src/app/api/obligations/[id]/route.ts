import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const obligation = await prisma.obligation.findUnique({
      where: { id },
      include: {
        contact: true,
        paymentMethod: true,
        payments: {
          orderBy: { dueDate: 'desc' },
          include: { financialMovement: true },
        },
      },
    })

    if (!obligation) {
      return NextResponse.json(
        { error: 'Obligación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(obligation)
  } catch (error) {
    console.error('Error fetching obligation:', error)
    return NextResponse.json(
      { error: 'Error al obtener la obligación' },
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

    const existing = await prisma.obligation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Obligación no encontrada' },
        { status: 404 }
      )
    }

    const originalAmount = body.originalAmount ?? existing.originalAmount
    const balance = Math.max(0, originalAmount - existing.paidAmount)

    const obligation = await prisma.obligation.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.contactId !== undefined && { contactId: body.contactId || null }),
        ...(body.originalAmount !== undefined && { originalAmount: body.originalAmount, balance }),
        ...(body.interestRate !== undefined && { interestRate: body.interestRate }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.paymentFrequency !== undefined && { paymentFrequency: body.paymentFrequency }),
        ...(body.paymentAmount !== undefined && { paymentAmount: body.paymentAmount }),
        ...(body.paymentMethodId !== undefined && { paymentMethodId: body.paymentMethodId || null }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.isRecurring !== undefined && { isRecurring: body.isRecurring }),
        ...(body.nextDueDate !== undefined && { nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        contact: true,
        paymentMethod: true,
        payments: true,
      },
    })

    return NextResponse.json(obligation)
  } catch (error) {
    console.error('Error updating obligation:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la obligación' },
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
    const payments = await prisma.obligationPayment.findMany({ where: { obligationId: id }, select: { financialMovementId: true } })
    const movementIds = payments.map(p => p.financialMovementId).filter(Boolean) as string[]
    if (movementIds.length > 0) {
      await prisma.financialMovement.deleteMany({ where: { id: { in: movementIds } } })
    }
    await prisma.obligationPayment.deleteMany({ where: { obligationId: id } })
    await prisma.obligation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting obligation:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la obligación' },
      { status: 500 }
    )
  }
}
