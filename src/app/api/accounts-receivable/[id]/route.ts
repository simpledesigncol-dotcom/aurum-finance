import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ar = await prisma.accountsReceivable.findUnique({
      where: { id },
      include: {
        contact: true,
        sale: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    if (!ar) {
      return NextResponse.json(
        { error: 'Cuenta por cobrar no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(ar)
  } catch (error) {
    console.error('Error fetching accounts receivable:', error)
    return NextResponse.json(
      { error: 'Error al obtener la cuenta por cobrar' },
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

    const ar = await prisma.accountsReceivable.update({
      where: { id },
      data: {
        ...(body.contactId !== undefined && { contactId: body.contactId }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.originalAmount !== undefined && { originalAmount: body.originalAmount }),
        ...(body.balance !== undefined && { balance: body.balance }),
        ...(body.issueDate !== undefined && { issueDate: new Date(body.issueDate) }),
        ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.agingBucket !== undefined && { agingBucket: body.agingBucket }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        contact: true,
        sale: true,
        payments: true,
      },
    })

    return NextResponse.json(ar)
  } catch (error) {
    console.error('Error updating accounts receivable:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la cuenta por cobrar' },
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
    await prisma.arPayment.deleteMany({ where: { accountsReceivableId: id } })
    await prisma.accountsReceivable.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting accounts receivable:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la cuenta por cobrar' },
      { status: 500 }
    )
  }
}
