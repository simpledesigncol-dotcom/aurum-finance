import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getCashRegisterBalance } from '@/lib/balances'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const registers = await prisma.cashRegister.findMany({
      orderBy: { createdAt: 'asc' },
    })

    const result = await Promise.all(
      registers.map(async (reg) => {
        const balance = await getCashRegisterBalance(reg.id)
        return {
          ...reg,
          balance,
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
