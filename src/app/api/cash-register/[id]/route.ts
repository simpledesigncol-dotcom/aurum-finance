import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { physicalCount, difference } = body

    const register = await prisma.cashRegister.update({
      where: { id },
      data: {
        physicalCount: physicalCount != null ? physicalCount : undefined,
        difference: difference != null ? difference : undefined,
      },
    })

    return NextResponse.json(register)
  } catch (error) {
    console.error('Error updating cash register:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la caja' },
      { status: 500 }
    )
  }
}
