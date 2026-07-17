import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const company = await prisma.company.create({
    data: {
      id: 'default',
      name: 'Aurum Detailing',
      currency: 'COP',
      timezone: 'America/Bogota',
    },
  })

  await prisma.user.create({
    data: {
      id: 'default-user',
      companyId: company.id,
      email: 'admin@aurum.com',
      name: 'Administrador',
      role: 'admin',
    },
  })

  await prisma.user.create({
    data: {
      id: 'user-gerente',
      companyId: company.id,
      email: 'gerente@aurum.com',
      name: 'Gerente',
      role: 'gerente',
    },
  })

  const expenseCategories = [
    'Arriendo', 'Servicios públicos', 'Suministros', 'Nómina',
    'Marketing', 'Transporte', 'Mantenimiento', 'Impuestos', 'Otros',
  ]

  for (const name of expenseCategories) {
    await prisma.category.create({
      data: { companyId: company.id, name, type: 'expense' },
    })
  }

  const incomeCategories = [
    'Servicios de detailing', 'Producto de venta', 'Comisión', 'Otros ingresos',
  ]

  for (const name of incomeCategories) {
    await prisma.category.create({
      data: { companyId: company.id, name, type: 'income' },
    })
  }

  const paymentMethods = [
    { name: 'Efectivo', type: 'cash' },
    { name: 'Daviplata', type: 'digital_wallet' },
    { name: 'Nequi', type: 'digital_wallet' },
    { name: 'Transferencia bancaria', type: 'bank_transfer' },
    { name: 'Datafono', type: 'card' },
    { name: 'QR', type: 'qr' },
  ]

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.create({
      data: { companyId: company.id, ...pm },
    })
  }

  await prisma.cashRegister.create({
    data: {
      companyId: company.id,
      name: 'Caja Principal',
      openingBalance: 0,
      status: 'closed',
    },
  })

  await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      bankName: 'Banco de Bogotá',
      accountType: 'ahorro',
      accountNumber: '1234567890',
      holderName: 'Aurum Detailing SAS',
    },
  })

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
