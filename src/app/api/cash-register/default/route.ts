import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getCashRegisterBalance } from '@/lib/balances'
import { getDateRange } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const registers = await prisma.cashRegister.findMany({
      orderBy: { createdAt: 'asc' },
    })

    const todayRange = getDateRange('today')

    const result = await Promise.all(
      registers.map(async (reg) => {
        const balance = await getCashRegisterBalance(reg.id)

        const [incomeAgg, expensesAgg] = await Promise.all([
          prisma.financialMovement.aggregate({
            where: {
              sourceId: reg.id,
              status: 'confirmed',
              direction: 'in',
              movementType: { not: 'transfer' },
              occurredAt: { gte: todayRange.start, lte: todayRange.end },
            },
            _sum: { amount: true },
          }),
          prisma.financialMovement.aggregate({
            where: {
              sourceId: reg.id,
              status: 'confirmed',
              direction: 'out',
              movementType: { not: 'transfer' },
              occurredAt: { gte: todayRange.start, lte: todayRange.end },
            },
            _sum: { amount: true },
          }),
        ])

        return {
          ...reg,
          balance,
          today: {
            income: incomeAgg._sum.amount || 0,
            expenses: expensesAgg._sum.amount || 0,
          },
        }
      })
    )

    const general = result.find((r) => r.type === 'general') || result[0] || null
    const minor = result.find((r) => r.type === 'minor') || null

    return NextResponse.json({ general, minor })
  } catch (error) {
    console.error('Error fetching default registers:', error)
    return NextResponse.json(
      { error: 'Error al obtener las cajas' },
      { status: 500 }
    )
  }
}
