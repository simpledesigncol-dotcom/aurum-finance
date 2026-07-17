'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'

interface DocumentAttachmentProps {
  referenceType: string
  referenceId: string
  onUploadComplete?: () => void
}

interface UploadedDoc {
  id: string
  name: string
  documentType: string
  fileUrl: string
}

export default function DocumentAttachment({
  referenceType,
  referenceId,
  onUploadComplete,
}: DocumentAttachmentProps) {
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('invoice')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', docType)
      formData.append('referenceType', referenceType)
      formData.append('referenceId', referenceId)

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const doc = await res.json()
        setDocs(prev => [...prev, doc])
        onUploadComplete?.()
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-blue/20 transition-all"
        >
          <option value="invoice">Factura</option>
          <option value="receipt">Comprobante</option>
          <option value="remission">Remision</option>
          <option value="contract">Contrato</option>
          <option value="photo">Foto</option>
          <option value="other">Otro</option>
        </select>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {uploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          Adjuntar archivo
        </button>
      </div>

      {docs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-[11px] border border-border"
            >
              <FileText size={11} className="text-muted-foreground" />
              <span className="truncate max-w-[100px]">{doc.name}</span>
              <button
                onClick={() => setDocs(prev => prev.filter(d => d.id !== doc.id))}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
