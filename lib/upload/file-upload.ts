// Sistema de Upload de Arquivos Robusto
import { createClient } from "@/lib/supabase/client"

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

    const { data: { publicUrl } } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    // Simular progresso (Supabase SDK não suporta onUploadProgress diretamente)
    if (onProgress) {
      onProgress(100)
    }

    return {
      id: data.path,
      name: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
      version: 1,
      uploadedAt: new Date().toISOString()
    }
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

  // Criar nova versão de arquivo
  async createFileVersion(
    orderId: string,
    file: File,
    bucket: string,
    path: string
  ): Promise<UploadedFile> {
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
        uploaded_by: (await this.supabase.auth.getUser()).data.user?.id
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
  async getFileVersions(orderId: string): Promise<UploadedFile[]> {
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
      uploadedAt: file.created_at
    })) || []
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
