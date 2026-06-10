// Sistema de Upload de Arquivos Robusto
import { createClient } from "@/lib/supabase/client"

// Limite atual: 50MB (plano gratuito Supabase). Subir para 100MB ao ativar o plano Pro.
export const MAX_FILE_SIZE_MB = 50

// Extensões aceitas para arquivos de design / exportação
export const DESIGN_FILE_EXTENSIONS = [
  'cdr', 'ai', 'eps', 'psd', 'pdf', 'svg',
  'png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif',
  'zip', 'rar', '7z',
]

export function getFileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

export function isAllowedDesignFile(name: string): boolean {
  return DESIGN_FILE_EXTENSIONS.includes(getFileExtension(name))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface UploadedFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  version: number
  uploadedAt: string
}

export interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export class FileUploadService {
  private supabase = createClient()

  // Validar tipo de arquivo
  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => file.type.startsWith(type))
  }

  // Validar tamanho do arquivo
  validateFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return file.size <= maxSizeBytes
  }

  // Comprimir imagem antes do upload
  async compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Não foi possível obter contexto do canvas'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Não foi possível comprimir a imagem'))
                return
              }
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            },
            file.type,
            quality
          )
        }
        img.onerror = () => reject(new Error('Erro ao carregar imagem'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
      reader.readAsDataURL(file)
    })
  }

  // Upload de arquivo com progresso
  async uploadFile(
    file: File,
    bucket: string,
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadedFile> {
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `${path}/${fileName}`

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Buckets privados: gera URL assinada (válida por 1 ano; o link de acesso é controlado pela app)
    const { data: signed } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365)

    if (onProgress) {
      onProgress(100)
    }

    return {
      id: data.path,
      name: file.name,
      url: signed?.signedUrl ?? '',
      size: file.size,
      type: file.type,
      version: 1,
      uploadedAt: new Date().toISOString()
    }
  }

  // Gera uma nova URL assinada para um arquivo já armazenado (para download posterior)
  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 60 * 60): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds)
    if (error) throw error
    return data.signedUrl
  }

  // Upload de múltiplos arquivos
  async uploadMultipleFiles(
    files: File[],
    bucket: string,
    path: string,
    onProgress?: (fileName: string, progress: number) => void
  ): Promise<UploadedFile[]> {
    const uploads = files.map(file =>
      this.uploadFile(file, bucket, path, (progress) => {
        onProgress?.(file.name, progress)
      })
    )

    return Promise.all(uploads)
  }

  // Deletar arquivo
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
  }

  // Criar nova versão de arquivo (salva metadados de storage para buckets privados)
  async createFileVersion(
    orderId: string,
    file: File,
    bucket: string,
    path: string,
    options?: { kind?: 'arte' | 'exportacao'; uploadedByName?: string }
  ): Promise<UploadedFile> {
    if (!isAllowedDesignFile(file.name)) {
      throw new Error(`Tipo de arquivo não permitido: .${getFileExtension(file.name)}`)
    }
    if (!this.validateFileSize(file, MAX_FILE_SIZE_MB)) {
      throw new Error(`Arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB`)
    }

    // Buscar última versão
    const { data: existingFiles } = await this.supabase
      .from('order_files')
      .select('version')
      .eq('order_id', orderId)
      .order('version', { ascending: false })
      .limit(1)

    const lastVersion = existingFiles?.[0]?.version || 0
    const newVersion = lastVersion + 1

    // Upload do novo arquivo
    const uploadedFile = await this.uploadFile(file, bucket, path)

    const userId = (await this.supabase.auth.getUser()).data.user?.id

    // Salvar no banco
    const { data, error } = await this.supabase
      .from('order_files')
      .insert({
        order_id: orderId,
        file_name: file.name,
        file_url: uploadedFile.url,
        file_type: file.type,
        file_size: file.size,
        version: newVersion,
        storage_path: uploadedFile.id,
        bucket,
        kind: options?.kind ?? 'arte',
        uploaded_by: userId,
        uploaded_by_name: options?.uploadedByName,
      })
      .select()
      .single()

    if (error) throw error

    return {
      ...uploadedFile,
      version: newVersion,
      uploadedAt: data.created_at
    }
  }

  // Buscar histórico de versões de um arquivo
  async getFileVersions(orderId: string): Promise<(UploadedFile & { bucket: string; storagePath: string; kind: string; uploadedByName?: string })[]> {
    const { data, error } = await this.supabase
      .from('order_files')
      .select('*')
      .eq('order_id', orderId)
      .order('version', { ascending: false })

    if (error) throw error

    return data?.map(file => ({
      id: file.id,
      name: file.file_name,
      url: file.file_url,
      size: file.file_size || 0,
      type: file.file_type,
      version: file.version,
      uploadedAt: file.created_at,
      bucket: file.bucket || 'design-files',
      storagePath: file.storage_path || '',
      kind: file.kind || 'arte',
      uploadedByName: file.uploaded_by_name || undefined,
    })) || []
  }

  // Deletar registro de arquivo (e do storage)
  async deleteOrderFile(fileId: string, bucket: string, storagePath: string): Promise<void> {
    if (storagePath) {
      await this.supabase.storage.from(bucket).remove([storagePath])
    }
    const { error } = await this.supabase.from('order_files').delete().eq('id', fileId)
    if (error) throw error
  }

  // Restaurar versão anterior
  async restoreFileVersion(fileId: string): Promise<void> {
    const { error } = await this.supabase
      .from('order_files')
      .update({ is_current: true })
      .eq('id', fileId)

    if (error) throw error
  }
}

export const fileUploadService = new FileUploadService()
