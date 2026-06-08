// Robust Upload Service for MÓDULO 23
// Drag & drop, preview, versionamento, compressão, validação

import { createClient } from "@/lib/supabase/client"

export interface UploadFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  preview?: string
  version: number
  created_at: string
}

export class RobustUploadService {
  private supabase = createClient()

  // Validação de tipos de arquivo
  private ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  private MAX_SIZE = 10 * 1024 * 1024 // 10MB

  // Validar arquivo
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Tipo de arquivo não permitido' }
    }

    if (file.size > this.MAX_SIZE) {
      return { valid: false, error: 'Arquivo muito grande (máximo 10MB)' }
    }

    return { valid: true }
  }

  // Comprimir imagem
  async compressImage(file: File, quality: number = 0.8): Promise<Blob> {
    if (!file.type.startsWith('image/')) {
      return file
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Falha ao comprimir imagem'))
          },
          file.type,
          quality
        )
      }

      img.onerror = () => reject(new Error('Falha ao carregar imagem'))
      img.src = URL.createObjectURL(file)
    })
  }

  // Gerar preview
  async generatePreview(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      return ''
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Falha ao gerar preview'))
      reader.readAsDataURL(file)
    })
  }

  // Upload com versionamento
  async uploadWithVersioning(
    file: File,
    bucket: string,
    path: string,
    compress: boolean = true
  ): Promise<UploadFile> {
    // Validar
    const validation = this.validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Comprimir se for imagem
    let fileToUpload = file
    if (compress && file.type.startsWith('image/')) {
      fileToUpload = (await this.compressImage(file)) as File
    }

    // Gerar preview
    const preview = await this.generatePreview(fileToUpload)

    // Upload
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `${path}/${fileName}`

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload, {
        upsert: false,
      })

    if (error) throw error

    // Obter URL pública
    const { data: { publicUrl } } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    // Salvar metadados no banco (versionamento)
    const { data: metadata } = await this.supabase
      .from('file_versions')
      .insert({
        original_name: file.name,
        file_path: filePath,
        file_url: publicUrl,
        file_size: fileToUpload.size,
        file_type: fileToUpload.type,
        preview_url: preview || null,
        version: 1,
      })
      .select()
      .single()

    return {
      id: metadata.id,
      name: file.name,
      size: fileToUpload.size,
      type: fileToUpload.type,
      url: publicUrl,
      preview,
      version: metadata.version,
      created_at: metadata.created_at,
    }
  }

  // Upload múltiplo
  async uploadMultiple(
    files: File[],
    bucket: string,
    path: string,
    compress: boolean = true
  ): Promise<UploadFile[]> {
    const uploads = files.map(file =>
      this.uploadWithVersioning(file, bucket, path, compress)
    )

    return Promise.all(uploads)
  }

  // Buscar histórico de versões
  async getFileVersions(originalName: string): Promise<UploadFile[]> {
    const { data, error } = await this.supabase
      .from('file_versions')
      .select('*')
      .eq('original_name', originalName)
      .order('version', { ascending: false })

    if (error) throw error

    return data?.map(v => ({
      id: v.id,
      name: v.original_name,
      size: v.file_size,
      type: v.file_type,
      url: v.file_url,
      preview: v.preview_url || undefined,
      version: v.version,
      created_at: v.created_at,
    })) || []
  }

  // Deletar arquivo
  async deleteFile(filePath: string, bucket: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) throw error

    // Deletar metadados
    await this.supabase
      .from('file_versions')
      .delete()
      .eq('file_path', filePath)
  }
}

export const robustUploadService = new RobustUploadService()
