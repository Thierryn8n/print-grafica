/**
 * Gerencia o estado da sessão de conversa do agente por cliente.
 * A sessão é persistida em public.agent_sessions (Supabase) para
 * sobreviver entre chamadas do webhook (stateless).
 */

import { createAdminClient } from "@/lib/supabase/admin"

export type AgentState =
  | "idle"          // aguardando primeiro contato
  | "collecting"    // coletando dados do pedido
  | "confirming"    // mostrando resumo, aguardando confirmação
  | "done"          // pedido criado, sessão encerrada

export type CollectedData = {
  client_name?: string
  client_phone?: string
  items?: Array<{
    shirt_type_id?: string
    short_type_id?: string
    fabric_id?: string
    shirt_type_name?: string
    short_type_name?: string
    fabric_name?: string
    sizes?: Record<string, number>   // { "P": 2, "M": 3, ... }
    quantity?: number
    description?: string
  }>
  general_notes?: string
  wants_logo?: boolean
  order_id?: string                  // preenchido após criar o pedido
}

export type AgentSession = {
  id: string
  company_id: string
  phone: string
  state: AgentState
  data: CollectedData
  last_message_at: string
}

/** Busca ou cria uma sessão para o telefone/empresa. */
export async function getOrCreateSession(
  companyId: string,
  phone: string,
): Promise<AgentSession> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from("agent_sessions")
    .select("*")
    .eq("company_id", companyId)
    .eq("phone", phone)
    .maybeSingle()

  if (existing) return existing as AgentSession

  const { data: created, error } = await supabase
    .from("agent_sessions")
    .insert({ company_id: companyId, phone, state: "idle", data: {} })
    .select()
    .single()

  if (error) throw error
  return created as AgentSession
}

/** Atualiza o estado e os dados coletados da sessão. */
export async function updateSession(
  sessionId: string,
  patch: { state?: AgentState; data?: CollectedData },
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("agent_sessions")
    .update({
      ...patch,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
  if (error) throw error
}

/** Reseta a sessão (cliente quer recomeçar ou pedido foi criado). */
export async function resetSession(sessionId: string): Promise<void> {
  await updateSession(sessionId, { state: "idle", data: {} })
}

/** Conta total de peças coletadas na sessão atual. */
export function countPieces(data: CollectedData): number {
  if (!data.items?.length) return 0
  return data.items.reduce((sum, item) => {
    if (item.sizes) {
      return sum + Object.values(item.sizes).reduce((s, n) => s + (Number(n) || 0), 0)
    }
    return sum + (item.quantity || 0)
  }, 0)
}
