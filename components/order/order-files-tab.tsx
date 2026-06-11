"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Download, Trash2, Loader2, ArrowRightCircle } from "lucide-react"
import {
  fileUploadService,
  formatFileSize,
  isAllowedDesignFile,
  getFileExtension,
  DESIGN_FILE_EXTENSIONS,
  MAX_FILE_SIZE_MB,
} from "@/lib/upload/file-upload"
import type { Order, ProductionStage } from "@/lib/store"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface OrderFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  version: number
  uploadedAt: string
  bucket: string
  storagePath: string
  kind: string
  uploadedByName?: string
}

interface OrderFilesTabProps {
  order: Order
  currentUserName?: string
  onPassStage: (id: string, toStage: ProductionStage) => Promise<void> | void
}

export function OrderFilesTab({ order, currentUserName, onPassStage }: OrderFilesTabProps) {
  const [files, setFiles] = useState<OrderFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pendingKind, setPendingKind] = useState<"arte" | "exportacao">("arte")
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const data = await fileUploadService.getFileVersions(order.id)
      setFiles(data as OrderFile[])
    } catch (e: any) {
      console.log("[v0] erro ao listar arquivos:", e?.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id])

  async function handleFiles(selected: FileList | null, kind: "arte" | "exportacao") {
    if (!selected || selected.length === 0) return
    setError(null)

    for (const file of Array.from(selected)) {
      if (!isAllowedDesignFile(file.name)) {
        setError(`Tipo não permitido: .${getFileExtension(file.name)}`)
        return
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" excede ${MAX_FILE_SIZE_MB}MB`)
        return
      }
    }

    setUploading(true)
    setProgress(0)
    try {
      for (const file of Array.from(selected)) {
        await fileUploadService.createFileVersion(order.id, file, "design-files", order.id, {
          kind,
          uploadedByName: currentUserName,
        })
        setProgress((p) => Math.min(100, p + 100 / selected.length))
      }
      await load()

      // "Anexar arquivo já repassa": ao subir arquivo de EXPORTAÇÃO, avança a etapa automaticamente.
      if (kind === "exportacao" && order.productionStage === "design1") {
        await onPassStage(order.id, "design2")
      }
    } catch (e: any) {
      setError(e?.message ?? "Erro ao enviar arquivo")
    }
    setUploading(false)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleDownload(file: OrderFile) {
    try {
      const url = file.storagePath
        ? await fileUploadService.getSignedUrl(file.bucket, file.storagePath, 60 * 10)
        : file.url
      window.open(url, "_blank")
    } catch (e: any) {
      setError("Não foi possível gerar o link de download")
    }
  }

  async function handleDelete(file: OrderFile) {
    if (!confirm(`Remover "${file.name}"?`)) return
    try {
      await fileUploadService.deleteOrderFile(file.id, file.bucket, file.storagePath)
      await load()
    } catch (e: any) {
      setError("Não foi possível remover o arquivo")
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={DESIGN_FILE_EXTENSIONS.map((e) => `.${e}`).join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, pendingKind)}
      />

      {/* Áreas de envio: Arte e Exportação */}
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            setPendingKind("arte")
            inputRef.current?.click()
          }}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors disabled:opacity-50"
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium text-sm">Enviar arte</p>
          <p className="text-xs text-muted-foreground mt-1">Arquivo de criação (CDR, AI, PSD...)</p>
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            setPendingKind("exportacao")
            inputRef.current?.click()
          }}
          className="border-2 border-dashed border-sky-400/40 bg-sky-500/5 rounded-xl p-6 text-center hover:border-sky-400/70 transition-colors disabled:opacity-50"
        >
          <ArrowRightCircle className="h-8 w-8 mx-auto text-sky-500 mb-2" />
          <p className="font-medium text-sm">Enviar arquivo de exportação</p>
          <p className="text-xs text-muted-foreground mt-1">Vai para a impressora • repassa a etapa</p>
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Formatos: {DESIGN_FILE_EXTENSIONS.join(", ").toUpperCase()} • máx. {MAX_FILE_SIZE_MB}MB por arquivo
      </p>

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando arquivo...
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
      )}

      {/* Lista de arquivos */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum arquivo anexado</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {files.map((file) => (
            <div key={file.id} className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  {file.kind === "exportacao" && (
                    <Badge variant="secondary" className="text-[10px] bg-sky-500/15 text-sky-600 shrink-0">
                      Exportação
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                  {file.version ? ` • v${file.version}` : ""}
                  {" • "}
                  {format(parseISO(file.uploadedAt), "dd/MM/yyyy", { locale: ptBR })}
                  {file.uploadedByName ? ` • ${file.uploadedByName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(file)}>
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Baixar</span>
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(file)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remover</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
