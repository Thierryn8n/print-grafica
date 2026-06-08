import { createClient } from "@/lib/supabase/client"
import type { DigitalAsset, AssetCategory } from "@/lib/types"

// Re-export types for convenience
export type { DigitalAsset, AssetCategory }
export { ASSET_CATEGORIES } from "@/lib/types"

// ===== CRUD Operations =====

export async function listAssets(filters?: {
  category?: AssetCategory
  client_id?: string
  order_id?: string
  search?: string
  tags?: string[]
  is_favorite?: boolean
}): Promise<DigitalAsset[]> {
  const supabase = createClient()
  let query = supabase
    .from("digital_assets")
    .select(`
      *,
      client:clients(id, name),
      order:orders(id, order_number, client_name),
      creator:profiles(id, full_name)
    `)
    .order("created_at", { ascending: false })

  if (filters?.category) {
    query = query.eq("category", filters.category)
  }

  if (filters?.client_id) {
    query = query.eq("client_id", filters.client_id)
  }

  if (filters?.order_id) {
    query = query.eq("order_id", filters.order_id)
  }

  if (filters?.is_favorite !== undefined) {
    query = query.eq("is_favorite", filters.is_favorite)
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as DigitalAsset[]
}

export async function getAsset(id: string): Promise<DigitalAsset | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("digital_assets")
    .select(`
      *,
      client:clients(id, name),
      order:orders(id, order_number, client_name),
      creator:profiles(id, full_name)
    `)
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as DigitalAsset | null
}

export async function createAsset(input: {
  name: string
  file_name: string
  file_url: string
  file_type: string
  file_size?: number
  category: AssetCategory
  tags?: string[]
  client_id?: string
  order_id?: string
  metadata?: Record<string, unknown>
}): Promise<DigitalAsset> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("digital_assets")
    .insert({
      name: input.name,
      file_name: input.file_name,
      file_url: input.file_url,
      file_type: input.file_type,
      file_size: input.file_size ?? null,
      category: input.category,
      tags: input.tags ?? [],
      client_id: input.client_id ?? null,
      order_id: input.order_id ?? null,
      metadata: input.metadata ?? {},
      created_by: userData.user?.id ?? null,
    })
    .select(`
      *,
      client:clients(id, name),
      order:orders(id, order_number, client_name),
      creator:profiles(id, full_name)
    `)
    .single()

  if (error) throw error
  return data as DigitalAsset
}

export async function updateAsset(
  id: string,
  patch: Partial<{
    name: string
    category: AssetCategory
    tags: string[]
    client_id: string
    order_id: string
    metadata: Record<string, unknown>
    is_favorite: boolean
  }>
): Promise<DigitalAsset> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("digital_assets")
    .update(patch)
    .eq("id", id)
    .select(`
      *,
      client:clients(id, name),
      order:orders(id, order_number, client_name),
      creator:profiles(id, full_name)
    `)
    .single()

  if (error) throw error
  return data as DigitalAsset
}

export async function toggleFavorite(id: string, value: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("digital_assets")
    .update({ is_favorite: value })
    .eq("id", id)

  if (error) throw error
}

export async function deleteAsset(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("digital_assets").delete().eq("id", id)

  if (error) throw error
}

// ===== Version Management =====

export async function createNewVersion(
  originalId: string,
  newFileUrl: string,
  newFileName: string
): Promise<DigitalAsset> {
  const supabase = createClient()
  
  // Get original asset
  const original = await getAsset(originalId)
  if (!original) throw new Error("Asset original não encontrado")

  // Increment version
  const newVersion = original.version + 1

  // Create new version
  const { data, error } = await supabase
    .from("digital_assets")
    .insert({
      name: original.name,
      file_name: newFileName,
      file_url: newFileUrl,
      file_type: original.file_type,
      file_size: original.file_size,
      category: original.category,
      tags: original.tags,
      client_id: original.client_id,
      order_id: original.order_id,
      metadata: {
        ...original.metadata,
        parent_id: originalId,
        version: newVersion,
      },
      version: newVersion,
      is_favorite: original.is_favorite,
      created_by: original.created_by,
    })
    .select(`
      *,
      client:clients(id, name),
      order:orders(id, order_number, client_name),
      creator:profiles(id, full_name)
    `)
    .single()

  if (error) throw error
  return data as DigitalAsset
}

export async function getAssetVersions(assetId: string): Promise<DigitalAsset[]> {
  const supabase = createClient()
  
  // Get original asset to get its name
  const original = await getAsset(assetId)
  if (!original) return []

  const { data, error } = await supabase
    .from("digital_assets")
    .select(`
      *,
      client:clients(id, name),
      order:orders(id, order_number, client_name),
      creator:profiles(id, full_name)
    `)
    .eq("name", original.name)
    .order("version", { ascending: false })

  if (error) throw error
  return (data ?? []) as DigitalAsset[]
}

// ===== Tag Management =====

export async function getAllTags(): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("digital_assets")
    .select("tags")

  if (error) throw error

  // Extract all unique tags
  const allTags = new Set<string>()
  for (const asset of data ?? []) {
    for (const tag of asset.tags ?? []) {
      allTags.add(tag)
    }
  }

  return Array.from(allTags).sort()
}

export async function addTagToAsset(assetId: string, tag: string): Promise<void> {
  const supabase = createClient
  
  const asset = await getAsset(assetId)
  if (!asset) throw new Error("Asset não encontrado")

  const updatedTags = [...new Set([...asset.tags, tag])]
  
  await updateAsset(assetId, { tags: updatedTags })
}

export async function removeTagFromAsset(assetId: string, tag: string): Promise<void> {
  const asset = await getAsset(assetId)
  if (!asset) throw new Error("Asset não encontrado")

  const updatedTags = asset.tags.filter(t => t !== tag)
  
  await updateAsset(assetId, { tags: updatedTags })
}

// ===== Statistics =====

export async function getAssetStats(): Promise<{
  total: number
  byCategory: Record<AssetCategory, number>
  bySize: number
  favorites: number
}> {
  const supabase = createClient()
  
  const { data: assets, error } = await supabase
    .from("digital_assets")
    .select("category, file_size, is_favorite")

  if (error) throw error

  const byCategory: Record<AssetCategory, number> = {
    logos: 0,
    vetores: 0,
    fontes: 0,
    mockups: 0,
    fotos: 0,
    arquivos_producao: 0,
    outros: 0,
  }

  let totalSize = 0
  let favorites = 0

  for (const asset of assets ?? []) {
    byCategory[asset.category as AssetCategory]++
    totalSize += asset.file_size ?? 0
    if (asset.is_favorite) favorites++
  }

  return {
    total: assets?.length ?? 0,
    byCategory,
    bySize: totalSize,
    favorites,
  }
}
