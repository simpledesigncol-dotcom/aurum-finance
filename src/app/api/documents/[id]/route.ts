import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    if (doc.fileUrl) {
      try {
        const filePath = join(process.cwd(), 'public', doc.fileUrl)
        await unlink(filePath)
      } catch {}
    }

    await prisma.document.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el documento' },
      { status: 500 }
    )
  }
}
