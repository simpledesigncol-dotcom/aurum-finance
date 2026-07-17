import { prisma } from '@/lib/prisma'

export async function getDefaultRegisterId(): Promise<string> {
  const register = await prisma.cashRegister.findFirst({ select: { id: true } })
  return register?.id || 'default'
}
