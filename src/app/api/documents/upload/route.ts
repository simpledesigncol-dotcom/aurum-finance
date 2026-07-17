import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('documentType') as string
    const referenceType = formData.get('referenceType') as string
    const referenceId = formData.get('referenceId') as string
    const financialMovementId = formData.get('financialMovementId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = join(uploadDir, filename)
    await writeFile(filePath, buffer)

    const doc = await prisma.document.create({
      data: {
        companyId: 'default',
        name: file.name,
        documentType: documentType || 'other',
        fileUrl: `/uploads/${filename}`,
        fileSize: file.size,
        fileType: file.type,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        financialMovementId: financialMovementId || null,
        uploadedBy: 'default-user',
        tags: "[]",
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Error al subir el documento' },
      { status: 500 }
    )
  }
}
