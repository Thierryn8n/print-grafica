"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, File as FileIcon, Image as ImageIcon, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fileUploadService, UploadProgress } from "@/lib/upload/file-upload"

interface FileUploadDropzoneProps {
  bucket: string
  path: string
  onUploadComplete?: (files: any[]) => void
  maxFiles?: number
  maxSizeMB?: number
  allowedTypes?: string[]
  accept?: string
}

export function FileUploadDropzone({
  bucket,
  path,
  onUploadComplete,
  maxFiles = 10,
  maxSizeMB = 10,
  allowedTypes = ['image/*', 'application/pdf'],
  accept = "image/*,.pdf"
}: FileUploadDropzoneProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Validar quantidade de arquivos
    if (uploads.length + acceptedFiles.length > maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos permitidos`)
      return
    }

    // Validar tamanho e tipo
    const validFiles = acceptedFiles.filter(file => {
      if (!fileUploadService.validateFileSize(file, maxSizeMB)) {
        alert(`Arquivo ${file.name} excede o tamanho máximo de ${maxSizeMB}MB`)
        return false
      }
      return true
    })

    // Adicionar uploads pendentes
    const newUploads: UploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Processar uploads
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i]
      try {
        setUploads(prev => 
          prev.map(u => u.file === upload.file ? { ...u, status: 'uploading' } : u)
        )

        // Comprimir se for imagem
        let fileToUpload = upload.file
        if (upload.file.type.startsWith('image/')) {
          try {
            fileToUpload = await fileUploadService.compressImage(upload.file)
          } catch (e) {
            console.error('Erro ao comprimir imagem:', e)
          }
        }

        const uploaded = await fileUploadService.uploadFile(
          fileToUpload,
          bucket,
          path,
          (progress) => {
            setUploads(prev => 
              prev.map(u => u.file === upload.file ? { ...u, progress } : u)
            )
          }
        )

        setUploads(prev => 
          prev.map(u => u.file === upload.file ? { ...u, status: 'completed', progress: 100 } : u)
        )

        setUploadedFiles(prev => [...prev, uploaded])
      } catch (error) {
        setUploads(prev => 
          prev.map(u => u.file === upload.file ? { ...u, status: 'error', error: 'Erro ao fazer upload' } : u)
        )
        console.error('Erro no upload:', error)
      }
    }

    // Notificar quando todos completarem
    setTimeout(() => {
      onUploadComplete?.(uploadedFiles)
    }, 500)
  }, [bucket, path, maxFiles, maxSizeMB, uploads.length, uploadedFiles, onUploadComplete])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    onDrop(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onDrop(files)
  }

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file))
  }

  const removeUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (type === 'application/pdf') return <FileText className="w-4 h-4" />
    return <FileIcon className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              {isDragActive ? 'Solte os arquivos aqui' : 'Arraste e solte arquivos aqui, ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo {maxFiles} arquivos, até {maxSizeMB}MB cada
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Uploads em progresso */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Uploads em andamento</h3>
          {uploads.map((upload, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getFileIcon(upload.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(upload.file.size)}</p>
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="mt-2" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {upload.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {upload.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeUpload(upload.file)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {upload.error && (
                <p className="text-xs text-destructive mt-2">{upload.error}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Arquivos enviados */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Arquivos enviados</h3>
          <div className="grid gap-2">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Badge variant="secondary">v{file.version}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeUploadedFile(file.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
