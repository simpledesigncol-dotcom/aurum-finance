import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // En serverless (Netlify) cada invocación puede crear una instancia efímera.
  // Configurar el pool de `pg` explícitamente (pasando PoolConfig al adapter,
  // que crea su propio Pool interno) evita el cold-start cuelga:
  //  - connectionTimeoutMillis>0: no esperar infinito abriendo la conexión (TLS a Supabase),
  //    evita que el request exceda el timeout de la función y devuelva 500.
  //  - max bajo: evita agotar el límite de conexiones de la BD con funciones concurrentes.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
