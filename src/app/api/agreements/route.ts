import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agreements = await prisma.agreement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      contact: true,
      creator: { select: { name: true, email: true } },
      items: {
        orderBy: { createdAt: 'desc' },
      },
      settlements: {
        orderBy: { settlementDate: 'desc' },
      },
    },
  })

  const summary = agreements.map((ag) => {
    const totalItemValue = ag.items.reduce((sum, item) => sum + item.totalValue, 0)
    const totalAurumEarnings = ag.items.reduce((sum, item) => sum + item.splitAurum, 0)
    const totalContractorEarnings = ag.items.reduce((sum, item) => sum + item.splitContractor, 0)
    const totalSettled = ag.settlements.reduce((sum, s) => {
      return s.direction === 'contractor_to_aurum'
        ? sum + s.amount
        : sum - s.amount
    }, 0)

    return {
      ...ag,
      totalItemValue,
      totalAurumEarnings,
      totalContractorEarnings,
      netBalance: totalAurumEarnings - totalSettled,
    }
  })

  return NextResponse.json(summary)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      contactId,
      title,
      description,
      contractorName,
      contractorIdNumber,
      serviceTypes,
      paintSplitAurum,
      paintSplitContractor,
      bodyworkSplitAurum,
      startDate,
      endDate,
      terminationNoticeDays,
      workSchedule,
      paymentTerms,
      notes,
      createdBy,
    } = body

    if (!title || !contractorName || !createdBy) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: título, nombre del contratista, creado por' },
        { status: 400 }
      )
    }

    const agreement = await prisma.agreement.create({
      data: {
        companyId: body.companyId || 'default',
        contactId: contactId || null,
        title,
        description: description || null,
        contractorName,
        contractorIdNumber: contractorIdNumber || null,
        serviceTypes: JSON.stringify(serviceTypes || ['pintura', 'latoneria']),
        paintSplitAurum: paintSplitAurum || 40,
        paintSplitContractor: paintSplitContractor || 60,
        bodyworkSplitAurum: bodyworkSplitAurum || 25,
        status: 'active',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        terminationNoticeDays: terminationNoticeDays || null,
        workSchedule: workSchedule || null,
        paymentTerms: paymentTerms || null,
        notes: notes || null,
        createdBy,
      },
      include: {
        contact: true,
        creator: { select: { name: true, email: true } },
        items: true,
        settlements: true,
      },
    })

    return NextResponse.json(agreement, { status: 201 })
  } catch (error) {
    console.error('Error creating agreement:', error)
    return NextResponse.json(
      { error: 'Error al crear el acuerdo' },
      { status: 500 }
    )
  }
}
