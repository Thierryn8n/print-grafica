import { createClient } from "@/lib/supabase/client"

// ===== Tipos =====

export type TemplateCategory =
  | "camisas"
  | "uniformes"
  | "canecas"
  | "chinelos"
  | "mousepads"
  | "copos"
  | "brindes"
  | "outros"

export const TEMPLATE_CATEGORIES: { key: TemplateCategory; label: string }[] = [
  { key: "camisas", label: "Camisas" },
  { key: "uniformes", label: "Uniformes" },
  { key: "canecas", label: "Canecas" },
  { key: "chinelos", label: "Chinelos" },
  { key: "mousepads", label: "Mousepads" },
  { key: "copos", label: "Copos" },
  { key: "brindes", label: "Brindes" },
  { key: "outros", label: "Outros" },
]

export type LayerType = "text" | "image" | "rect"

export interface TemplateLayer {
  id: string
  type: LayerType
  name: string
  // posição/tamanho em porcentagem (0-100) relativa ao canvas
  x: number
  y: number
  width: number
  height: number
  // conteúdo: para texto pode conter placeholders {{nome}}
  content: string
  fontSize?: number
  fontWeight?: "normal" | "bold"
  color?: string
  align?: "left" | "center" | "right"
  rotation?: number
}

export interface ArtTemplate {
  id: string
  name: string
  category: TemplateCategory
  description: string | null
  preview_url: string | null
  base_file_url: string | null
  width_mm: number
  height_mm: number
  layers: TemplateLayer[]
  placeholders: string[]
  version: number
  is_favorite: boolean
  tags: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface GeneratedVersion {
  label: string
  values: Record<string, string>
  layers: TemplateLayer[]
}

export interface ArtGeneration {
  id: string
  template_id: string | null
  order_id: string | null
  batch_label: string | null
  total_versions: number
  versions: GeneratedVersion[]
  status: "processing" | "completed" | "failed"
  created_by: string | null
  created_at: string
}

// ===== Motor de placeholders =====

const PLACEHOLDER_RE = /\{\{\s*([\w.-]+)\s*\}\}/g

/** Extrai todos os placeholders únicos de um conjunto de camadas. */
export function extractPlaceholders(layers: TemplateLayer[]): string[] {
  const found = new Set<string>()
  for (const layer of layers) {
    if (layer.type !== "text") continue
    let m: RegExpExecArray | null
    PLACEHOLDER_RE.lastIndex = 0
    while ((m = PLACEHOLDER_RE.exec(layer.content)) !== null) {
      found.add(m[1])
    }
  }
  return Array.from(found)
}

/** Substitui os placeholders de um texto pelos valores fornecidos. */
export function applyValues(text: string, values: Record<string, string>): string {
  return text.replace(PLACEHOLDER_RE, (_full, key: string) => {
    const v = values[key]
    return v !== undefined && v !== null && v !== "" ? String(v) : ""
  })
}

/** Gera uma cópia das camadas com os placeholders substituídos. */
export function renderLayers(layers: TemplateLayer[], values: Record<string, string>): TemplateLayer[] {
  return layers.map((layer) =>
    layer.type === "text" ? { ...layer, content: applyValues(layer.content, values) } : { ...layer },
  )
}

/**
 * Gera N versões de arte a partir de um template e uma lista de registros de dados.
 * Cada registro vira uma versão com os placeholders preenchidos.
 */
export function generateVersions(
  template: ArtTemplate,
  records: Record<string, string>[],
  labelKey?: string,
): GeneratedVersion[] {
  return records.map((values, idx) => ({
    label: labelKey && values[labelKey] ? values[labelKey] : `Versão ${idx + 1}`,
    values,
    layers: renderLayers(template.layers, values),
  }))
}

// ===== CRUD de templates =====

export async function listTemplates(category?: TemplateCategory): Promise<ArtTemplate[]> {
  const supabase = createClient()
  let query = supabase.from("art_templates").select("*").order("updated_at", { ascending: false })
  if (category) query = query.eq("category", category)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ArtTemplate[]
}

export async function getTemplate(id: string): Promise<ArtTemplate | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("art_templates").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data as ArtTemplate | null
}

export async function createTemplate(input: Partial<ArtTemplate>): Promise<ArtTemplate> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const layers = (input.layers ?? []) as TemplateLayer[]
  const payload = {
    name: input.name ?? "Novo template",
    category: input.category ?? "camisas",
    description: input.description ?? null,
    preview_url: input.preview_url ?? null,
    base_file_url: input.base_file_url ?? null,
    width_mm: input.width_mm ?? 210,
    height_mm: input.height_mm ?? 297,
    layers,
    placeholders: extractPlaceholders(layers),
    tags: input.tags ?? [],
    created_by: userData.user?.id ?? null,
  }
  const { data, error } = await supabase.from("art_templates").insert(payload).select().single()
  if (error) throw error
  return data as ArtTemplate
}

export async function updateTemplate(id: string, patch: Partial<ArtTemplate>): Promise<ArtTemplate> {
  const supabase = createClient()
  const updates: Record<string, unknown> = { ...patch }
  if (patch.layers) {
    updates.placeholders = extractPlaceholders(patch.layers as TemplateLayer[])
  }
  const { data, error } = await supabase.from("art_templates").update(updates).eq("id", id).select().single()
  if (error) throw error
  return data as ArtTemplate
}

export async function toggleFavorite(id: string, value: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("art_templates").update({ is_favorite: value }).eq("id", id)
  if (error) throw error
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("art_templates").delete().eq("id", id)
  if (error) throw error
}

// ===== Histórico de gerações =====

export async function saveGeneration(input: {
  template_id: string
  order_id?: string | null
  batch_label?: string
  versions: GeneratedVersion[]
}): Promise<ArtGeneration> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const payload = {
    template_id: input.template_id,
    order_id: input.order_id ?? null,
    batch_label: input.batch_label ?? null,
    total_versions: input.versions.length,
    versions: input.versions,
    status: "completed" as const,
    created_by: userData.user?.id ?? null,
  }
  const { data, error } = await supabase.from("art_generations").insert(payload).select().single()
  if (error) throw error
  return data as ArtGeneration
}

export async function listGenerations(templateId?: string): Promise<ArtGeneration[]> {
  const supabase = createClient()
  let query = supabase.from("art_generations").select("*").order("created_at", { ascending: false })
  if (templateId) query = query.eq("template_id", templateId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ArtGeneration[]
}

/** Converte texto colado/CSV em registros de dados para gerar versões. */
export function parseRecordsFromText(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ","
  const headers = lines[0].split(delimiter).map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter)
    const rec: Record<string, string> = {}
    headers.forEach((h, i) => {
      rec[h] = (cells[i] ?? "").trim()
    })
    return rec
  })
}
