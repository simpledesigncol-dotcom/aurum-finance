import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const register = await prisma.cashRegister.findFirst({
      select: { id: true, name: true, openingBalance: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!register) {
      return NextResponse.json({ registerId: null, name: null, openingBalance: 0 })
    }

    return NextResponse.json({ registerId: register.id, name: register.name, openingBalance: register.openingBalance })
  } catch {
    return NextResponse.json({ registerId: null, name: null })
  }
}
