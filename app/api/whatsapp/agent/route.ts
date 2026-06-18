/**
 * POST /api/whatsapp/agent
 * Cérebro do agente IA — chamado pelo webhook após salvar a mensagem.
 * Recebe: company_id, phone, message_text, message_type, media_url?
 * Processa: monta contexto → chama NVIDIA → interpreta intenção → age → responde via Z-API
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { callNvidia, imageUrlToBase64 } from "@/lib/nvidia"
import { loadCatalog, loadHistory, buildMessages } from "@/lib/agent-context"
import {
  getOrCreateSession,
  updateSession,
  resetSession,
  countPieces,
  type CollectedData,
} from "@/lib/agent-session"
import { sendText } from "@/lib/zapi"

type AgentRequest = {
  company_id: string
  phone: string
  message_text: string
  message_type: string
  media_url?: string
  sender_name?: string
}

// Palavras-chave que reiniciam o atendimento
const RESET_KEYWORDS = ["cancelar", "reiniciar", "recomeçar", "sair", "cancel", "restart"]

// Palavras-chave que indicam confirmação do pedido
const CONFIRM_KEYWORDS = ["sim", "confirmo", "confirmar", "pode fazer", "fechado", "ok", "tá bom", "correto", "isso mesmo"]

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Validação interna — somente chamadas do nosso próprio webhook
  const internalSecret = req.headers.get("x-internal-secret")
  if (internalSecret !== process.env.INTERNAL_AGENT_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: AgentRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const { company_id, phone, message_text, message_type, media_url, sender_name } = body
  if (!company_id || !phone) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Verificar se o agente está habilitado para esta empresa
  const { data: settings } = await supabase
    .from("system_settings")
    .select("agent_enabled, agent_instructions, agent_name, agent_tone")
    .eq("company_id", company_id)
    .maybeSingle()

  if (!settings?.agent_enabled) {
    // Agente desabilitado — não responde
    return NextResponse.json({ skipped: true, reason: "agent disabled" })
  }

  // 2. Carregar sessão, catálogo e histórico
  const [session, catalog, history] = await Promise.all([
    getOrCreateSession(company_id, phone),
    loadCatalog(company_id),
    loadHistory(company_id, phone, 12),
  ])

  const text = (message_text || "").trim()
  const lower = text.toLowerCase()

  // 3. Comandos especiais — reset
  if (RESET_KEYWORDS.some((kw) => lower === kw || lower.startsWith(kw + " "))) {
    await resetSession(session.id)
    await sendText(phone, "Tudo bem! Vamos recomeçar. Como posso te ajudar? 😊")
    return NextResponse.json({ ok: true, action: "reset" })
  }

  // 4. Atualizar nome do cliente se ainda não temos
  const sessionData: CollectedData = { ...session.data }
  if (!sessionData.client_name && sender_name && sender_name !== phone) {
    sessionData.client_name = sender_name
  }

  // 5. Baixar imagem se existir (para enviar à NVIDIA com visão)
  let imageBase64: string | undefined
  if (message_type === "image" && media_url) {
    try {
      imageBase64 = await imageUrlToBase64(media_url)
    } catch {
      // Se falhar ao baixar a imagem, continua sem ela
    }
  }

  // 6. Montar mensagens e chamar a NVIDIA
  let aiReply = ""
  try {
    const messages = await buildMessages(
      { ...session, data: sessionData },
      catalog,
      history,
      text || (message_type === "image" ? "O cliente enviou uma imagem." : "(mensagem de mídia)"),
      imageBase64,
    )
    aiReply = await callNvidia(messages, 600)
  } catch (err: any) {
    console.error("[agent] erro NVIDIA:", err?.message)
    // Fallback amigável se a IA falhar
    aiReply =
      "Desculpe, estou com uma instabilidade momentânea. Por favor, aguarde alguns segundos e tente novamente!"
  }

  // 7. Interpretar se o cliente confirmou o pedido (estado = confirming)
  let nextState = session.state
  const isConfirming = session.state === "confirming"
  const clientConfirmed = isConfirming && CONFIRM_KEYWORDS.some((kw) => lower.includes(kw))
  const aiMentionedSummary =
    aiReply.toLowerCase().includes("resumo") || aiReply.toLowerCase().includes("confirmar")

  if (clientConfirmed) {
    // Criar o pedido no banco
    try {
      const orderPayload = await createOrderFromSession(company_id, phone, sessionData, catalog)
      await updateSession(session.id, {
        state: "done",
        data: { ...sessionData, order_id: orderPayload.order_id },
      })
      nextState = "done"
    } catch (err: any) {
      console.error("[agent] erro ao criar pedido:", err?.message)
    }
  } else if (aiMentionedSummary && session.state === "collecting") {
    nextState = "confirming"
    await updateSession(session.id, { state: "confirming", data: sessionData })
  } else if (session.state === "idle" || session.state === "collecting") {
    // Tentar extrair dados da resposta da IA e da mensagem do cliente
    const extracted = extractDataFromConversation(text, sessionData, catalog)
    await updateSession(session.id, {
      state: "collecting",
      data: { ...sessionData, ...extracted },
    })
    nextState = "collecting"
  }

  // 8. Enviar resposta ao cliente via Z-API
  if (aiReply) {
    await sendText(phone, aiReply)
  }

  // 9. Se pedido foi criado (done), resetar sessão após um tempo
  if (nextState === "done") {
    // Manter a sessão no estado "done" por ora (não resetar imediatamente)
  }

  return NextResponse.json({ ok: true, state: nextState, replied: !!aiReply })
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Extrai dados básicos do texto do cliente (nome, quantidades simples). */
function extractDataFromConversation(
  text: string,
  current: CollectedData,
  catalog: any,
): Partial<CollectedData> {
  const result: Partial<CollectedData> = {}

  // Tenta capturar o nome se a mensagem for simples (ex: "meu nome é João")
  const nameMatch = text.match(/(?:me chamo|meu nome[eé\s]+|sou o?\s+)([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)?)/i)
  if (nameMatch && !current.client_name) {
    result.client_name = nameMatch[1].trim()
  }

  return result
}

/** Cria o pedido no banco a partir dos dados coletados na sessão. */
async function createOrderFromSession(
  companyId: string,
  phone: string,
  data: CollectedData,
  catalog: any,
): Promise<{ order_id: string }> {
  const supabase = createAdminClient()

  // Buscar ou criar o cliente pelo telefone
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("company_id", companyId)
    .eq("phone", phone)
    .maybeSingle()

  let clientId = existingClient?.id
  if (!clientId) {
    const { data: newClient, error: clientErr } = await supabase
      .from("clients")
      .insert({
        company_id: companyId,
        name: data.client_name || "Cliente WhatsApp",
        phone,
      })
      .select("id")
      .single()
    if (clientErr) throw clientErr
    clientId = newClient.id
  }

  // Montar a descrição do pedido
  const totalQty = countPieces(data)
  const itemLines = (data.items || []).map((item, i) => {
    const type = item.shirt_type_name || item.short_type_name || "item"
    const fabric = item.fabric_name ? ` | ${item.fabric_name}` : ""
    const sizes = item.sizes
      ? Object.entries(item.sizes)
          .filter(([, n]) => n > 0)
          .map(([sz, n]) => `${sz}:${n}`)
          .join(" ")
      : item.quantity
      ? `Qtd: ${item.quantity}`
      : ""
    return `${i + 1}. ${type}${fabric}${sizes ? ` | ${sizes}` : ""}`
  })

  const description = [
    `Pedido via WhatsApp — ${data.client_name || "Cliente"}`,
    ...itemLines,
    data.wants_logo ? `★ Logo da empresa (desconto de R$${catalog.logo_offer?.discount || 50})` : "",
    data.general_notes ? `Observações: ${data.general_notes}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  // Criar o número do pedido
  const orderNumber = `WA-${Date.now().toString(36).toUpperCase()}`

  // Buscar o criador padrão (primeiro admin da empresa)
  const { data: admin } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle()

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      company_id: companyId,
      client_id: clientId,
      order_number: orderNumber,
      client_name: data.client_name || "Cliente WhatsApp",
      product_type: itemLines[0] || "Uniforme personalizado",
      quantity: totalQty || 1,
      description,
      status: "novo-pedido",
      priority: "normal",
      created_by: admin?.id || null,
      metadata: {
        source: "whatsapp-agente",
        items: data.items,
        wants_logo: data.wants_logo || false,
        phone,
      },
    })
    .select("id")
    .single()

  if (orderErr) throw orderErr

  return { order_id: order.id }
}
