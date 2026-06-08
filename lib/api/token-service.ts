import { createClient } from "@/lib/supabase/client"

export interface ApiToken {
  id: string
  name: string
  token_hash: string
  token_prefix: string
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  usage_count: number
  expires_at: string | null
  created_by: string | null
  created_at: string
}

export interface ApiLog {
  id: string
  token_id: string | null
  method: string
  endpoint: string
  status_code: number | null
  ip_address: string | null
  created_at: string
}

/** Gera um token aleatório legível (prefixo + segredo). */
export function generateRawToken(): { raw: string; prefix: string } {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const secret = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  const prefix = "pf_" + secret.slice(0, 6)
  const raw = `${prefix}_${secret}`
  return { raw, prefix }
}

/** Hash SHA-256 do token (armazenamos apenas o hash). */
export async function hashToken(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function listApiTokens(): Promise<ApiToken[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("api_tokens").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as ApiToken[]
}

export interface CreateTokenResult {
  token: ApiToken
  rawToken: string
}

export async function createApiToken(name: string, scopes: string[], expiresAt?: string | null): Promise<CreateTokenResult> {
  const supabase = createClient()
  const { raw, prefix } = generateRawToken()
  const token_hash = await hashToken(raw)
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("api_tokens")
    .insert({
      name,
      token_hash,
      token_prefix: prefix,
      scopes,
      expires_at: expiresAt ?? null,
      created_by: userData.user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return { token: data as ApiToken, rawToken: raw }
}

export async function toggleApiToken(id: string, isActive: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("api_tokens").update({ is_active: isActive }).eq("id", id)
  if (error) throw error
}

export async function deleteApiToken(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("api_tokens").delete().eq("id", id)
  if (error) throw error
}

export async function listApiLogs(limit = 50): Promise<ApiLog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("api_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as ApiLog[]
}

export const API_SCOPES = [
  { value: "read", label: "Leitura (consultar pedidos e itens)" },
  { value: "write", label: "Escrita (criar/atualizar pedidos)" },
  { value: "export", label: "Exportação (CorelDRAW, PDF)" },
] as const
