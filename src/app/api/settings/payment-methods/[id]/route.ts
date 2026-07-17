import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.paymentMethod.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el método de pago' },
      { status: 500 }
    )
  }
}
