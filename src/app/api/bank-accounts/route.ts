import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const accounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const accountIds = accounts.map((a) => a.id)

    const movements = await prisma.financialMovement.groupBy({
      by: ['sourceId'],
      where: {
        sourceType: 'bank_account',
        sourceId: { in: accountIds },
      },
      _sum: { amount: true },
    })

    const balanceMap = new Map<string, number>()
    for (const m of movements) {
      const incoming = await prisma.financialMovement.aggregate({
        where: { sourceType: 'bank_account', sourceId: m.sourceId, direction: 'incoming' },
        _sum: { amount: true },
      })
      const outgoing = await prisma.financialMovement.aggregate({
        where: { sourceType: 'bank_account', sourceId: m.sourceId, direction: 'outgoing' },
        _sum: { amount: true },
      })
      balanceMap.set(
        m.sourceId,
        (incoming._sum.amount || 0) - (outgoing._sum.amount || 0)
      )
    }

    const result = accounts.map((account) => ({
      ...account,
      balance: balanceMap.get(account.id) || 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return NextResponse.json(
      { error: 'Error al obtener las cuentas bancarias' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bankName, accountType, accountNumber, holderName } = body

    if (!bankName) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: bankName' },
        { status: 400 }
      )
    }

    const account = await prisma.bankAccount.create({
      data: {
        companyId: 'default',
        bankName,
        accountType: accountType || null,
        accountNumber: accountNumber || null,
        holderName: holderName || null,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Error creating bank account:', error)
    return NextResponse.json(
      { error: 'Error al crear la cuenta bancaria' },
      { status: 500 }
    )
  }
}
