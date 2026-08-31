import { prisma } from '@/lib/prisma'

export async function getCashRegisterBalance(registerId: string): Promise<number> {
  const register = await prisma.cashRegister.findUnique({
    where: { id: registerId },
    select: { openingBalance: true },
  })

  if (!register) throw new Error('Caja no encontrada')

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
    where: { companyId, isActive: true },
    select: { id: true },
  })

  if (accounts.length === 0) return 0

  const accountIds = accounts.map((a) => a.id)

  const movements = await prisma.financialMovement.groupBy({
    by: ['sourceId', 'direction'],
    where: {
      sourceType: 'bank_account',
      sourceId: { in: accountIds },
      status: 'confirmed',
    },
    _sum: { amount: true },
  })

  return movements.reduce((total, m) => {
    const delta = m.direction === 'in' ? (m._sum.amount || 0) : -(m._sum.amount || 0)
    return total + delta
  }, 0)
}

export async function getSourceBalance(
  sourceType: string,
  sourceId: string
): Promise<number> {
  if (sourceType === 'cash_register') return getCashRegisterBalance(sourceId)
  if (sourceType === 'bank_account') return getBankAccountBalance(sourceId)
  return 0
}

export async function getWorkOrderFinancials(workOrderId: string) {
  const movements = await prisma.financialMovement.findMany({
    where: { workOrderId },
    select: { amount: true, direction: true, movementType: true },
  })

  const totalIncome = movements
    .filter((m) => m.direction === 'in')
    .reduce((sum, m) => sum + m.amount, 0)

  const totalCosts = movements
    .filter((m) => m.direction === 'out')
    .reduce((sum, m) => sum + m.amount, 0)

  const profit = totalIncome - totalCosts
  const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0

  const totalPaid = movements
    .filter((m) =>
      ['sale', 'income', 'ar_payment', 'capital_contribution'].includes(m.movementType) &&
      m.direction === 'in'
    )
    .reduce((sum, m) => sum + m.amount, 0)

  const arBalance = await prisma.accountsReceivable.aggregate({
    where: { workOrderId },
    _sum: { balance: true },
  })

  const balanceReceivable = arBalance._sum.balance || 0

  return {
    totalIncome,
    totalCosts,
    profit,
    margin,
    totalPaid,
    balanceReceivable,
  }
}

export async function getCompanyPosition(companyId: string) {
  const [registers, bankAccounts, arAggregate, apAggregate, obligationAggregate] =
    await Promise.all([
      prisma.cashRegister.findMany({
        where: { companyId },
        select: { id: true },
      }),
      prisma.bankAccount.findMany({
        where: { companyId, isActive: true },
        select: { id: true },
      }),
      prisma.accountsReceivable.aggregate({
        where: { companyId, status: { notIn: ['paid', 'cancelled'] } },
        _sum: { balance: true },
      }),
      prisma.accountsPayable.aggregate({
        where: { companyId, status: { notIn: ['paid', 'cancelled'] } },
        _sum: { balance: true },
      }),
      prisma.obligation.aggregate({
        where: { companyId, status: { notIn: ['paid', 'cancelled'] } },
        _sum: { balance: true },
      }),
    ])

  let totalCash = 0
  for (const reg of registers) {
    totalCash += await getCashRegisterBalance(reg.id)
  }

  let totalBanks = 0
  for (const acc of bankAccounts) {
    totalBanks += await getBankAccountBalance(acc.id)
  }

  const totalReceivable = arAggregate._sum.balance || 0
  const totalPayable = apAggregate._sum.balance || 0
  const totalObligations = obligationAggregate._sum.balance || 0

  const available = totalCash + totalBanks + totalReceivable - totalPayable - totalObligations

  return {
    totalCash,
    totalBanks,
    totalReceivable,
    totalPayable,
    totalObligations,
    available,
  }
}
