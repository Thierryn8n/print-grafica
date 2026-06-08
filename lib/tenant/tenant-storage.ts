import { createClient } from "@/lib/supabase/client"

/**
 * Tenant-aware storage service
 * This service manages file storage with tenant isolation
 */
export class TenantStorage {
  private supabase: ReturnType<typeof createClient>
  private companyId: string | null

  constructor(companyId: string | null) {
    this.supabase = createClient()
    this.companyId = companyId
  }

  /**
   * Get the storage path for a tenant
   * Files are organized as: {company-slug}/{category}/{filename}
   */
  private getStoragePath(category: string, filename: string, companySlug?: string): string {
    if (!this.companyId) {
      return `${category}/${filename}`
    }
    const slug = companySlug || this.companyId
    return `${slug}/${category}/${filename}`
  }

  /**
   * Upload a file to tenant-isolated storage
   */
  async uploadFile(
    bucket: string,
    category: string,
    file: File,
    companySlug?: string
  ): Promise<{ path: string; error: Error | null }> {
    if (!this.companyId) {
      return {
        path: "",
        error: new Error("No tenant context - cannot upload file")
      }
    }

    const filename = `${Date.now()}-${file.name}`
    const path = this.getStoragePath(category, filename, companySlug)

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false,
      })

    if (error) {
      return { path: "", error }
    }

    return { path: data.path, error: null }
  }

  /**
   * Upload multiple files to tenant-isolated storage
   */
  async uploadFiles(
    bucket: string,
    category: string,
    files: File[],
    companySlug?: string
  ): Promise<{ path: string; error: Error | null }[]> {
    const uploads = files.map(file => this.uploadFile(bucket, category, file, companySlug))
    return Promise.all(uploads)
  }

  /**
   * Get a public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  /**
   * Get a signed URL for a file (temporary access)
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<{ url: string; error: Error | null }> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      return { url: "", error }
    }

    return { url: data.signedUrl, error: null }
  }

  /**
   * Delete a file from tenant storage
   */
  async deleteFile(bucket: string, path: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.storage.from(bucket).remove([path])
    return { error: error || null }
  }

  /**
   * Delete multiple files from tenant storage
   */
  async deleteFiles(bucket: string, paths: string[]): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.storage.from(bucket).remove(paths)
    return { error: error || null }
  }

  /**
   * List files in a tenant's storage category
   */
  async listFiles(bucket: string, category: string, companySlug?: string): Promise<{ files: string[]; error: Error | null }> {
    if (!this.companyId) {
      return { files: [], error: new Error("No tenant context") }
    }

    const prefix = this.getStoragePath(category, "", companySlug).replace(/\/$/, "")
    
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(prefix)

    if (error) {
      return { files: [], error }
    }

    const files = data.map(item => item.name)
    return { files, error: null }
  }

  /**
   * Get storage usage for a tenant
   */
  async getStorageUsage(bucket: string, companySlug?: string): Promise<{ bytes: number; error: Error | null }> {
    if (!this.companyId) {
      return { bytes: 0, error: new Error("No tenant context") }
    }

    const prefix = this.getStoragePath("", "", companySlug).replace(/\/$/, "")
    
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(prefix, {
        limit: 1000,
        offset: 0,
      })

    if (error) {
      return { bytes: 0, error }
    }

    const totalBytes = data.reduce((sum, item) => sum + (item.metadata?.size || 0), 0)
    return { bytes: totalBytes, error: null }
  }
}

/**
 * Create a tenant-aware storage service
 */
export function createTenantStorage(companyId: string | null): TenantStorage {
  return new TenantStorage(companyId)
}
