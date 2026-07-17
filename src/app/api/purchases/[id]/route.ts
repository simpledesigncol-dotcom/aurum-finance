import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        contact: true,
        items: {
          orderBy: { id: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Error fetching purchase:', error)
    return NextResponse.json(
      { error: 'Error al obtener la compra' },
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

    const purchase = await prisma.purchase.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.contactId !== undefined && { contactId: body.contactId || null }),
        ...(body.purchaseType !== undefined && { purchaseType: body.purchaseType }),
        ...(body.paymentType !== undefined && { paymentType: body.paymentType }),
        ...(body.tax !== undefined && { tax: body.tax }),
        ...(body.invoiceNumber !== undefined && { invoiceNumber: body.invoiceNumber }),
      },
      include: {
        contact: true,
        items: true,
        payments: true,
      },
    })

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Error updating purchase:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la compra' },
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

    await prisma.purchasePayment.deleteMany({ where: { purchaseId: id } })
    await prisma.financialMovement.deleteMany({ where: { referenceType: 'purchase', referenceId: id } })
    await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } })
    await prisma.purchase.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la compra' },
      { status: 500 }
    )
  }
}
