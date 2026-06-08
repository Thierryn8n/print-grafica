import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

/**
 * Cliente admin (service role) para a API pública de automação.
 * NÃO usar em código de cliente — apenas em route handlers no servidor.
 */
export function createAdminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function sha256Hex(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export interface AuthedToken {
  id: string
  name: string
  scopes: string[]
}

export interface AuthResult {
  ok: boolean
  token?: AuthedToken
  error?: string
  status?: number
}

/** Valida o header Authorization: Bearer <token> contra a tabela api_tokens. */
export async function authenticateRequest(req: Request, requiredScope: string): Promise<AuthResult> {
  const header = req.headers.get("authorization") || ""
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return { ok: false, error: "Token ausente. Use o header Authorization: Bearer <token>", status: 401 }
  }
  const raw = match[1].trim()
  const hash = await sha256Hex(raw)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, name, scopes, is_active, expires_at")
    .eq("token_hash", hash)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: "Token inválido", status: 401 }
  }
  if (!data.is_active) {
    return { ok: false, error: "Token desativado", status: 403 }
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { ok: false, error: "Token expirado", status: 403 }
  }
  if (!data.scopes.includes(requiredScope) && !data.scopes.includes("write")) {
    // 'write' inclui read; checagem simples de escopo
    if (!(requiredScope === "read" && data.scopes.includes("export"))) {
      return { ok: false, error: `Escopo insuficiente. Requer: ${requiredScope}`, status: 403 }
    }
  }

  // atualiza uso (sem bloquear a resposta)
  await supabase.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id)
  await supabase.rpc("increment_token_usage", { p_token_id: data.id }).then(
    () => {},
    () => {},
  )

  return { ok: true, token: { id: data.id, name: data.name, scopes: data.scopes } }
}

export async function logApiCall(tokenId: string | null, method: string, endpoint: string, statusCode: number, ip?: string) {
  try {
    const supabase = createAdminClient()
    await supabase.from("api_logs").insert({
      token_id: tokenId,
      method,
      endpoint,
      status_code: statusCode,
      ip_address: ip ?? null,
    })
  } catch {
    // logging não deve quebrar a resposta
  }
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
