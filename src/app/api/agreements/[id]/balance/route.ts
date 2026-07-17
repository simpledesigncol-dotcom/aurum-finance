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
      items: true,
      settlements: true,
    },
  })

  if (!agreement) {
    return NextResponse.json({ error: 'Acuerdo no encontrado' }, { status: 404 })
  }

  const totalItemValue = agreement.items.reduce((sum, item) => sum + item.totalValue, 0)
  const totalAurumEarnings = agreement.items.reduce((sum, item) => sum + item.splitAurum, 0)
  const totalContractorEarnings = agreement.items.reduce((sum, item) => sum + item.splitContractor, 0)

  const totalSettledToContractor = agreement.settlements
    .filter(s => s.direction === 'aurum_to_contractor')
    .reduce((sum, s) => sum + s.amount, 0)

  const totalSettledFromContractor = agreement.settlements
    .filter(s => s.direction === 'contractor_to_aurum')
    .reduce((sum, s) => sum + s.amount, 0)

  const pendingItemsByService = {
    pintura: agreement.items.filter(i => i.serviceType === 'pintura' && i.status !== 'paid'),
    latoneria: agreement.items.filter(i => i.serviceType === 'latoneria' && i.status !== 'paid'),
  }

  return NextResponse.json({
    totalItemValue,
    totalAurumEarnings,
    totalContractorEarnings,
    totalSettledToContractor,
    totalSettledFromContractor,
    netBalance: totalAurumEarnings - totalSettledToContractor + totalSettledFromContractor,
    pendingItemsCount: agreement.items.filter(i => i.status !== 'paid').length,
    completedItemsCount: agreement.items.filter(i => i.status === 'paid').length,
    pendingItemsByService,
  })
}
