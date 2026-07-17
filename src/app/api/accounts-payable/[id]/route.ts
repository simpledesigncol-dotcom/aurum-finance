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

    const ap = await prisma.accountsPayable.update({
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
    await prisma.apPayment.deleteMany({ where: { accountsPayableId: id } })
    await prisma.accountsPayable.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting accounts payable:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la cuenta por pagar' },
      { status: 500 }
    )
  }
}
