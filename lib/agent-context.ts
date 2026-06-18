/**
 * Monta o contexto completo que o agente recebe em cada turno:
 *  - System prompt (instruções do gerente + catálogo + estado da sessão)
 *  - Histórico das últimas mensagens da conversa
 */

import { createAdminClient } from "@/lib/supabase/admin"
import type { NvidiaMessage } from "@/lib/nvidia"
import type { AgentSession } from "@/lib/agent-session"
import { countPieces } from "@/lib/agent-session"

export type CatalogData = {
  fabrics: Array<{ id: string; name: string; description?: string }>
  shirt_types: Array<{ id: string; name: string; description?: string }>
  short_types: Array<{ id: string; name: string; description?: string }>
  logo_offer: { enabled: boolean; discount?: number; min_pieces?: number; title?: string }
  agent: { name: string; tone: string; instructions?: string }
}

/** Busca o catálogo completo + config do agente via RPC. */
export async function loadCatalog(companyId: string): Promise<CatalogData> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("get_agent_catalog", { p_company_id: companyId })
  if (error) throw error
  return data as CatalogData
}

/** Busca as últimas N mensagens da conversa para o histórico. */
export async function loadHistory(
  companyId: string,
  phone: string,
  limit = 12,
): Promise<Array<{ from_me: boolean; body: string; message_type: string; media_url?: string }>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("from_me, body, message_type, media_url")
    .eq("company_id", companyId)
    .eq("chat_phone", phone)
    .order("message_timestamp", { ascending: false })
    .limit(limit)
  return ((data as any[]) ?? []).reverse()
}

function catalogToText(catalog: CatalogData): string {
  const shirts = catalog.shirt_types.map((s) => `• ${s.name}${s.description ? ` — ${s.description}` : ""}`).join("\n")
  const shorts = catalog.short_types.map((s) => `• ${s.name}${s.description ? ` — ${s.description}` : ""}`).join("\n")
  const fabrics = catalog.fabrics.map((f) => `• ${f.name}${f.description ? ` — ${f.description}` : ""}`).join("\n")

  const offer = catalog.logo_offer.enabled
    ? `\nOferta especial disponível: desconto de R$${catalog.logo_offer.discount} ao adicionar a logo da empresa do cliente (pedido mínimo: ${catalog.logo_offer.min_pieces} peças).`
    : ""

  return `TIPOS DE CAMISA:\n${shirts || "Nenhum cadastrado"}\n\nTIPOS DE CALÇÃO/REGATA:\n${shorts || "Nenhum cadastrado"}\n\nTECIDOS/MATERIAIS:\n${fabrics || "Nenhum cadastrado"}${offer}`
}

function sessionToText(session: AgentSession): string {
  const pieces = countPieces(session.data)
  const lines: string[] = [`Estado atual da conversa: ${session.state}`]

  if (session.data.client_name) lines.push(`Nome do cliente: ${session.data.client_name}`)
  if (pieces > 0) lines.push(`Peças coletadas até agora: ${pieces}`)
  if (session.data.items?.length) {
    lines.push(`Itens do pedido:`)
    session.data.items.forEach((item, i) => {
      const type = item.shirt_type_name || item.short_type_name || "item"
      const fabric = item.fabric_name ? ` | Tecido: ${item.fabric_name}` : ""
      const sizes = item.sizes
        ? Object.entries(item.sizes)
            .filter(([, n]) => n > 0)
            .map(([sz, n]) => `${sz}:${n}`)
            .join(" ")
        : ""
      lines.push(`  ${i + 1}. ${type}${fabric}${sizes ? ` | Tamanhos: ${sizes}` : ""}`)
    })
  }
  if (session.data.general_notes) lines.push(`Observações: ${session.data.general_notes}`)
  if (session.data.wants_logo) lines.push(`Cliente deseja adicionar a logo da empresa.`)

  return lines.join("\n")
}

/**
 * Monta o array de mensagens completo para enviar à NVIDIA.
 */
export async function buildMessages(
  session: AgentSession,
  catalog: CatalogData,
  history: Array<{ from_me: boolean; body: string; message_type: string; media_url?: string }>,
  incomingText: string,
  incomingImageBase64?: string,
): Promise<NvidiaMessage[]> {
  const agentName = catalog.agent.name || "Atendente"
  const tone =
    catalog.agent.tone === "descontraído"
      ? "amigável e descontraído, como um amigo do cliente"
      : catalog.agent.tone === "formal"
      ? "formal e respeitoso"
      : "profissional, cordial e direto"

  const systemPrompt = `Você é ${agentName}, atendente virtual de uma gráfica que produz uniformes e camisetas personalizadas. Responda SEMPRE em português brasileiro. Seu tom deve ser ${tone}.

SEU OBJETIVO: Coletar todas as informações necessárias para fazer o pedido do cliente e, no final, criar o pedido no sistema. Seja natural, não robotizado. Nunca peça todas as informações de uma vez — converse, um passo de cada vez.

FLUXO DO ATENDIMENTO:
1. Cumprimente e pergunte o nome do cliente (se não souber)
2. Pergunte o que o cliente deseja (camisa, calção, regata, etc.)
3. Pergunte o tecido/material preferido
4. Pergunte as quantidades por tamanho (P, M, G, GG, XGG)
5. Pergunte se tem mais itens para adicionar
6. Se elegível, ofereça a logo da empresa com desconto
7. Pergunte observações gerais (prazo, arte, etc.)
8. Mostre um resumo completo e peça confirmação
9. Ao confirmar, diga que o pedido foi registrado e que em breve entrarão em contato

REGRAS IMPORTANTES:
- Pedido mínimo: 10 peças (podem ser misturadas entre camisas e calções)
- Se o cliente enviar uma imagem de modelo/arte, descreva o que viu e pergunte se é esse o estilo desejado
- Se o cliente perguntar sobre preços, diga que o orçamento será enviado pela equipe após confirmar o pedido
- Nunca invente produtos que não estão no catálogo abaixo
- Para encerrar/reiniciar o atendimento, o cliente pode digitar "cancelar" ou "reiniciar"
- Seja BREVE nas respostas — máximo 3 parágrafos curtos

${catalog.agent.instructions ? `INSTRUÇÕES ESPECIAIS DO GERENTE:\n${catalog.agent.instructions}\n` : ""}
CATÁLOGO DISPONÍVEL:
${catalogToText(catalog)}

ESTADO ATUAL DA SESSÃO:
${sessionToText(session)}`

  const messages: NvidiaMessage[] = [{ role: "system", content: systemPrompt }]

  // Histórico recente (últimas mensagens, excluindo a atual)
  for (const msg of history.slice(-10)) {
    const role = msg.from_me ? "assistant" : "user"
    if (msg.body) {
      messages.push({ role, content: msg.body })
    }
  }

  // Mensagem atual do cliente (com ou sem imagem)
  if (incomingImageBase64) {
    messages.push({
      role: "user",
      content: [
        ...(incomingText ? [{ type: "text" as const, text: incomingText }] : []),
        { type: "image_url" as const, image_url: { url: incomingImageBase64 } },
      ],
    })
  } else {
    messages.push({ role: "user", content: incomingText || "(mensagem sem texto)" })
  }

  return messages
}
