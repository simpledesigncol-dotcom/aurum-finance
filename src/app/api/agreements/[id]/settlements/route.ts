import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      agreementItemId,
      settlementDate,
      amount,
      direction,
      paymentMethod,
      reference,
      notes,
      createdBy,
    } = body

    if (!amount || !direction || !createdBy) {
      return NextResponse.json(
        { error: 'Cam requeridos: monto, dirección, creado por' },
        { status: 400 }
      )
    }

    const settlement = await prisma.agreementSettlement.create({
      data: {
        agreementId: id,
        agreementItemId: agreementItemId || null,
        settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
        amount,
        direction,
        paymentMethod: paymentMethod || null,
        reference: reference || null,
        notes: notes || null,
        createdBy,
      },
    })

    return NextResponse.json(settlement, { status: 201 })
  } catch (error) {
    console.error('Error creating settlement:', error)
    return NextResponse.json(
      { error: 'Error al crear el abono' },
      { status: 500 }
    )
  }
}
