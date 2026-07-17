import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      contact: true,
      creator: { select: { name: true, email: true } },
      items: {
        orderBy: { createdAt: 'desc' },
        include: {
          settlements: true,
        },
      },
      settlements: {
        orderBy: { settlementDate: 'desc' },
        include: {
          agreementItem: true,
        },
      },
    },
  })

  if (!agreement) {
    return NextResponse.json(
      { error: 'Acuerdo no encontrado' },
      { status: 404 }
    )
  }

  return NextResponse.json(agreement)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const agreement = await prisma.agreement.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        contact: true,
        items: true,
        settlements: true,
      },
    })

    return NextResponse.json(agreement)
  } catch (error) {
    console.error('Error updating agreement:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el acuerdo' },
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
    await prisma.agreementSettlement.deleteMany({ where: { agreementId: id } })
    await prisma.agreementItem.deleteMany({ where: { agreementId: id } })
    await prisma.agreement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting agreement:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el acuerdo' },
      { status: 500 }
    )
  }
}
