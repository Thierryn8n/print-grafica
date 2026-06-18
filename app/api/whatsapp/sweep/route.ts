/**
 * POST /api/whatsapp/sweep
 * Varre todas as conversas com mensagens não respondidas (última msg é do cliente),
 * lê o histórico completo de cada uma e dispara o agente para continuar o atendimento.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).single()
  if (!profile?.company_id) return NextResponse.json({ error: "no company" }, { status: 403 })

  const companyId = profile.company_id
  const admin = createAdminClient()

  // Verificar se o agente está habilitado
  const { data: settings } = await admin
    .from("system_settings")
    .select("agent_enabled")
    .eq("company_id", companyId)
    .maybeSingle()

  if (!settings?.agent_enabled) {
    return NextResponse.json({ skipped: true, reason: "agent disabled" })
  }

  // Buscar últimas mensagens de cada conversa para identificar as não respondidas
  const { data: allMsgs } = await admin
    .from("whatsapp_messages")
    .select("chat_phone, sender_name, from_me, body, message_type, media_url, message_timestamp")
    .eq("company_id", companyId)
    .order("message_timestamp", { ascending: false })
    .limit(500)

  if (!allMsgs || allMsgs.length === 0) {
    return NextResponse.json({ swept: 0, message: "Nenhuma mensagem encontrada" })
  }

  // Agrupar por telefone e pegar a última mensagem de cada conversa
  const lastByPhone = new Map<string, typeof allMsgs[number]>()
  for (const msg of allMsgs) {
    if (!lastByPhone.has(msg.chat_phone)) {
      lastByPhone.set(msg.chat_phone, msg)
    }
  }

  // Filtrar apenas conversas onde a última mensagem é do cliente (não respondidas)
  const unanswered = Array.from(lastByPhone.values()).filter((m) => !m.from_me)

  if (unanswered.length === 0) {
    return NextResponse.json({ swept: 0, message: "Todas as conversas ja foram respondidas" })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://printflowstudio-creative.vercel.app"

  // Disparar o agente para cada conversa não respondida (com delay entre cada um)
  let dispatched = 0
  for (const msg of unanswered) {
    try {
      // Verificar se o agente não está pausado para esse contato
      const { data: meta } = await admin
        .from("whatsapp_conversation_meta")
        .select("agent_paused")
        .eq("company_id", companyId)
        .eq("chat_phone", msg.chat_phone)
        .maybeSingle()

      if (meta?.agent_paused) continue

      fetch(`${appUrl}/api/whatsapp/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_AGENT_SECRET || "",
        },
        body: JSON.stringify({
          company_id: companyId,
          phone: msg.chat_phone,
          message_text: msg.body || "",
          message_type: msg.message_type || "text",
          media_url: msg.media_url,
          sender_name: msg.sender_name,
        }),
      }).catch(() => {})

      dispatched++

      // Pequeno delay para não sobrecarregar a API da NVIDIA
      await new Promise((r) => setTimeout(r, 800))
    } catch {
      // Continua para o próximo
    }
  }

  return NextResponse.json({
    swept: unanswered.length,
    dispatched,
    message: `${dispatched} conversa(s) retomada(s) pelo agente`,
  })
}
