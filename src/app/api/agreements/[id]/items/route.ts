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
      vehiclePlate,
      vehicleInfo,
      serviceType,
      serviceDescription,
      totalValue,
      thirdPartyNeeded,
      thirdPartyCost,
      notes,
      createdBy,
    } = body

    if (!vehiclePlate || !serviceType || !totalValue || !createdBy) {
      return NextResponse.json(
        { error: 'Campos requeridos: placa, tipo de servicio, valor total, creado por' },
        { status: 400 }
      )
    }

    const agreement = await prisma.agreement.findUnique({ where: { id } })
    if (!agreement) {
      return NextResponse.json({ error: 'Acuerdo no encontrado' }, { status: 404 })
    }

    let splitAurum: number
    let splitContractor: number

    if (serviceType === 'pintura') {
      splitAurum = totalValue * (agreement.paintSplitAurum / 100)
      splitContractor = totalValue * (agreement.paintSplitContractor / 100)
    } else {
      splitAurum = totalValue * (agreement.bodyworkSplitAurum / 100)
      splitContractor = totalValue * (1 - agreement.bodyworkSplitAurum / 100)
    }

    const item = await prisma.agreementItem.create({
      data: {
        agreementId: id,
        vehiclePlate,
        vehicleInfo: vehicleInfo || null,
        serviceType,
        serviceDescription: serviceDescription || null,
        totalValue,
        splitAurum,
        splitContractor,
        thirdPartyNeeded: thirdPartyNeeded || false,
        thirdPartyCost: thirdPartyCost || null,
        notes: notes || null,
        createdBy,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating agreement item:', error)
    return NextResponse.json(
      { error: 'Error al crear el item del acuerdo' },
      { status: 500 }
    )
  }
}
