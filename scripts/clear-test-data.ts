import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.depreciationEntry.deleteMany()
  await prisma.agreementSettlement.deleteMany()
  await prisma.agreementItem.deleteMany()
  await prisma.agreement.deleteMany()
  await prisma.transfer.deleteMany()
  await prisma.document.deleteMany()
  await prisma.importLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.obligationPayment.deleteMany()
  await prisma.obligation.deleteMany()
  await prisma.apPayment.deleteMany()
  await prisma.accountsPayable.deleteMany()
  await prisma.arPayment.deleteMany()
  await prisma.accountsReceivable.deleteMany()
  await prisma.salePayment.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.purchasePayment.deleteMany()
  await prisma.purchaseItem.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.financialMovement.deleteMany()
  await prisma.contact.deleteMany()
  console.log('All test data cleared.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
