import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('documentType')

    const where: Record<string, unknown> = {}
    if (documentType) where.documentType = documentType

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Error al obtener los documentos' },
      { status: 500 }
    )
  }
}
