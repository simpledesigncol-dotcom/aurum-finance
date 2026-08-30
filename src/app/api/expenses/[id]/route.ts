import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { resolveSourceFromPaymentMethod } from '@/lib/payment-sources'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        contact: true,
        paymentMethod: true,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Gasto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error fetching expense:', error)
    return NextResponse.json(
      { error: 'Error al obtener el gasto' },
      { status: 500 }
    )
  }
}

async function resolveOrCreateContact(name: string | null | undefined, companyId: string): Promise<string | null> {
  if (!name) return null
  const existing = await prisma.contact.findFirst({
    where: { name: { equals: name, mode: 'insensitive' as const }, companyId },
    select: { id: true },
  })
  if (existing) return existing.id
  const contact = await prisma.contact.create({
    data: { name, type: 'other', companyId },
  })
  return contact.id
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Gasto no encontrado' },
        { status: 404 }
      )
    }

    const companyId = existing.companyId
    let resolvedContactId = existing.contactId
    if (body.contactName !== undefined) {
      resolvedContactId = await resolveOrCreateContact(body.contactName, companyId)
    } else if (body.contactId !== undefined) {
      resolvedContactId = body.contactId || null
    }

    const expense = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {
        contactId: resolvedContactId,
      }
      if (body.amount !== undefined) data.amount = parseFloat(body.amount)
      if (body.expenseDate !== undefined) data.expenseDate = new Date(body.expenseDate)
      if (body.categoryId !== undefined) data.categoryId = body.categoryId || null
      if (body.description !== undefined) data.description = body.description || null
      if (body.paymentMethodId !== undefined) data.paymentMethodId = body.paymentMethodId || null
      if (body.receiptNumber !== undefined) data.receiptNumber = body.receiptNumber || null

      const updated = await tx.expense.update({
        where: { id },
        data,
        include: {
          category: true,
          contact: true,
          paymentMethod: true,
        },
      })

      // Sync the linked financial movement (amount / date / notes live on the movement)
      if (updated.financialMovementId) {
        const mData: Record<string, unknown> = {
          amount: updated.amount,
          movementDate: updated.expenseDate,
          occurredAt: updated.expenseDate,
          contactId: updated.contactId,
        }
        const srcChanged = body.paymentMethodId !== undefined
        if (srcChanged) {
          const { sourceType, sourceId } = await resolveSourceFromPaymentMethod(updated.paymentMethodId, companyId)
          mData.sourceType = sourceType
          mData.sourceId = sourceId
        }
        if (body.notes !== undefined) mData.notes = body.notes || null
        if (body.description !== undefined) mData.description = body.description || null
        await tx.financialMovement.update({
          where: { id: updated.financialMovementId },
          data: mData,
        })
      }

      return updated
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el gasto' },
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
      await tx.financialMovement.deleteMany({ where: { referenceType: 'expense', referenceId: id } })
      await tx.expense.delete({ where: { id } })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el gasto' },
      { status: 500 }
    )
  }
}
