'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Upload, Trash2, Filter, Image, File, FileCode, Loader2, FileSpreadsheet } from 'lucide-react'
import Modal from '@/components/ui/modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { formatDate } from '@/lib/utils'

interface Document {
  id: string
  name: string
  documentType: string
  fileUrl: string
  fileSize: number | null
  fileType: string | null
  referenceType: string | null
  referenceId: string | null
  createdAt: string
}

const docTypeOptions = [
  { id: 'invoice', label: 'Factura' },
  { id: 'receipt', label: 'Comprobante' },
  { id: 'remission', label: 'Remisión' },
  { id: 'contract', label: 'Contrato' },
  { id: 'photo', label: 'Foto' },
  { id: 'other', label: 'Otro' },
]

function getFileIcon(fileType: string | null) {
  if (!fileType) return File
  if (fileType.startsWith('image/')) return Image
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet
  if (fileType.includes('word') || fileType.includes('document')) return FileCode
  return File
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState('other')
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fetchDocuments = useCallback(async (docType?: string) => {
    try {
      const url = docType ? `/api/documents?documentType=${docType}` : '/api/documents'
      const res = await fetch(url)
      const data = await res.json()
      setDocuments(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocuments(filterType || undefined) }, [fetchDocuments, filterType])

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentType', uploadType)
      formData.append('referenceType', 'general')
      formData.append('referenceId', 'general')

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const doc = await res.json()
        setDocuments(prev => [doc, ...prev])
        setUploadModalOpen(false)
        setSelectedFile(null)
        setUploadType('other')
      }
    } catch {
      console.error('Error uploading document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/documents/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id))
      }
      setDeleteTarget(null)
    } catch {
      console.error('Error deleting document')
    }
  }

  const typeCount = (type: string) => documents.filter(d => d.documentType === type).length
  const totalSize = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0)

  if (loading) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-96 bg-card rounded-xl border border-border animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestión de archivos adjuntos</p>
        </div>
        <button
          onClick={() => { setSelectedFile(null); setUploadType('other'); setUploadModalOpen(true) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Upload size={14} strokeWidth={1.8} />
          Subir documento
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{documents.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Espacio</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{formatFileSize(totalSize)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Facturas</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{typeCount('invoice')}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fotos</span>
          <p className="text-xl font-bold tabular-nums mt-2 tracking-tight">{typeCount('photo')}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <h2 className="font-semibold text-sm">Documentos</h2>
          <Filter size={13} className="text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full max-w-xs px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
          >
            <option value="">Todos los tipos</option>
            {docTypeOptions.map(dt => (
              <option key={dt.id} value={dt.id}>{dt.label}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground ml-auto">{documents.length} documento{documents.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="divide-y divide-border">
          {documents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin documentos</p>
              <p className="text-xs text-muted-foreground mt-1">Sube archivos para tenerlos organizados</p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="mt-3 text-xs text-blue font-medium hover:underline"
              >
                Subir documento
              </button>
            </div>
          ) : (
            documents.map((doc) => {
              const Icon = getFileIcon(doc.fileType)
              return (
                <div key={doc.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                        {docTypeOptions.find(dt => dt.id === doc.documentType)?.label || doc.documentType}
                      </span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors shrink-0"
                    >
                      <FileText size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="w-7 h-7 rounded-lg hover:bg-danger/[0.06] flex items-center justify-center text-muted-foreground hover:text-danger transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {uploadModalOpen && (
        <Modal
          title="Subir documento"
          subtitle="Adjunta un archivo al sistema"
          onClose={() => setUploadModalOpen(false)}
        >
          <div className="p-4 sm:p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo de documento</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 transition-all duration-150"
              >
                {docTypeOptions.map(dt => (
                  <option key={dt.id} value={dt.id}>{dt.label}</option>
                ))}
              </select>
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-blue/40 transition-colors">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setSelectedFile(file)
                }}
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-success/[0.08] flex items-center justify-center mx-auto">
                    <FileText size={18} className="text-success" />
                  </div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload size={24} className="text-muted-foreground/60 mx-auto" />
                  <p className="text-sm text-muted-foreground">Haz clic para seleccionar un archivo</p>
                  <p className="text-[11px] text-muted-foreground/60">PDF, JPG, PNG, DOC, XLS (max 10MB)</p>
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-xs font-medium"
              >
                Seleccionar archivo
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Subir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar documento"
          message={`¿Seguro que deseas eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
