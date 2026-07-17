import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.expenseDate !== undefined && { expenseDate: new Date(body.expenseDate) }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.contactId !== undefined && { contactId: body.contactId || null }),
        ...(body.paymentMethodId !== undefined && { paymentMethodId: body.paymentMethodId || null }),
        ...(body.receiptNumber !== undefined && { receiptNumber: body.receiptNumber }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        category: true,
        contact: true,
        paymentMethod: true,
      },
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
    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el gasto' },
      { status: 500 }
    )
  }
}
