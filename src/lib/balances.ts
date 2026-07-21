import { prisma } from '@/lib/prisma'

export async function getCashRegisterBalance(registerId: string): Promise<number> {
  const register = await prisma.cashRegister.findUnique({
    where: { id: registerId },
    select: { openingBalance: true, physicalCount: true },
  })

  if (!register) throw new Error('Caja no encontrada')

  if (register.physicalCount != null) return Number(register.physicalCount)

  const movements = await prisma.financialMovement.findMany({
    where: {
      sourceType: 'cash_register',
      sourceId: registerId,
      status: 'confirmed',
    },
    select: { amount: true, direction: true },
  })

  const balance = movements.reduce((acc, m) => {
    const amt = Number(m.amount)
    return m.direction === 'in' ? acc + amt : acc - amt
  }, Number(register.openingBalance))

  return balance
}

export async function getBankAccountBalance(accountId: string): Promise<number> {
  const movements = await prisma.financialMovement.findMany({
    where: {
      sourceType: 'bank_account',
      sourceId: accountId,
      status: 'confirmed',
    },
    select: { amount: true, direction: true },
  })

  return movements.reduce((acc, m) => {
    const amt = Number(m.amount)
    return m.direction === 'in' ? acc + amt : acc - amt
  }, 0)
}

export async function getTotalCashBalance(companyId: string): Promise<number> {
  const registers = await prisma.cashRegister.findMany({
    where: { companyId },
    select: { id: true, openingBalance: true },
  })

  let total = 0
  for (const reg of registers) {
    total += await getCashRegisterBalance(reg.id)
  }
  return total
}

export async function getTotalBankBalance(companyId: string): Promise<number> {
  const accounts = await prisma.bankAccount.findMany({
    where: { companyId },
    select: { id: true },
  })

  let total = 0
  for (const acc of accounts) {
    total += await getBankAccountBalance(acc.id)
  }
  return total
}

export async function getSourceBalance(
  sourceType: string,
  sourceId: string
): Promise<number> {
  if (sourceType === 'cash_register') return getCashRegisterBalance(sourceId)
  if (sourceType === 'bank_account') return getBankAccountBalance(sourceId)
  return 0
}
