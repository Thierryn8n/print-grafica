import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

type IntentItem = {
  cliente: string
  telefone: string
  pedido: string
  quantidade: string
  prazo: string
  prioridade: "alta" | "media" | "baixa"
}

/**
 * Gera um relatório semanal a partir das mensagens do WhatsApp usando o Gemini.
 * Lê as mensagens dos últimos `days` dias (padrão 7) da empresa do usuário.
 */
export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada. Adicione a chave do Google Gemini nas variáveis de ambiente." },
      { status: 400 },
    )
  }

  let days = 7
  try {
    const body = await req.json()
    if (body?.days && Number.isFinite(body.days)) days = Math.min(Math.max(1, body.days), 31)
  } catch {
    // usa o padrão
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Pega o company_id do usuário (para salvar o relatório).
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", auth.user.id)
    .single()

  const { data: messages, error } = await supabase
    .from("whatsapp_messages")
    .select("chat_phone, sender_name, from_me, message_type, body, caption, message_timestamp")
    .gte("message_timestamp", since.toISOString())
    .order("message_timestamp", { ascending: true })
    .limit(1500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma mensagem encontrada no período selecionado." },
      { status: 404 },
    )
  }

  // Monta o transcript apenas com mensagens recebidas de clientes (from_me=false)
  // e respostas, para dar contexto.
  const transcript = messages
    .map((m) => {
      const who = m.from_me ? "EMPRESA" : m.sender_name || m.chat_phone
      const text = m.body || m.caption || (m.message_type !== "text" ? `[${m.message_type}]` : "")
      const when = new Date(m.message_timestamp).toLocaleString("pt-BR")
      return `[${when}] ${who} (${m.chat_phone}): ${text}`
    })
    .join("\n")

  const prompt = `Você é um assistente de uma gráfica/confecção de uniformes esportivos sublimados.
Analise as mensagens de WhatsApp abaixo (da última semana) e extraia um relatório de PEDIDOS e INTENÇÕES DE COMPRA dos clientes.

Para cada cliente que demonstrou interesse ou fez um pedido, identifique:
- nome do cliente (use o nome do contato; se não houver, use o telefone)
- telefone
- o que ele quer (produto, modelo, descrição)
- quantidade (se mencionada, senão "não informado")
- prazo desejado (se mencionado, senão "não informado")
- prioridade (alta se há urgência/prazo curto, media se é um pedido normal, baixa se é só cotação/dúvida)

Responda APENAS com um JSON válido neste formato, sem texto extra, sem markdown:
{
  "resumo": "um parágrafo resumindo a semana: total de clientes, pedidos quentes, padrões observados",
  "itens": [
    { "cliente": "", "telefone": "", "pedido": "", "quantidade": "", "prazo": "", "prioridade": "alta|media|baixa" }
  ]
}

MENSAGENS:
${transcript}`

  // Chama o Gemini via REST
  const model = "gemini-2.0-flash"
  let aiText = ""
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      },
    )

    if (!resp.ok) {
      const errText = await resp.text()
      return NextResponse.json({ error: `Erro do Gemini: ${resp.status} ${errText}` }, { status: 502 })
    }

    const json = await resp.json()
    aiText = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  } catch (e: any) {
    return NextResponse.json({ error: `Falha ao chamar o Gemini: ${e.message}` }, { status: 502 })
  }

  // Parseia o JSON retornado pela IA
  let parsed: { resumo: string; itens: IntentItem[] }
  try {
    parsed = JSON.parse(aiText)
  } catch {
    // fallback: tenta extrair o primeiro bloco JSON
    const match = aiText.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : { resumo: aiText, itens: [] }
  }

  // Salva o relatório
  if (profile?.company_id) {
    await supabase.from("whatsapp_reports").insert({
      company_id: profile.company_id,
      created_by: auth.user.id,
      period_start: since.toISOString(),
      period_end: new Date().toISOString(),
      summary: parsed.resumo ?? "",
      data: parsed,
      message_count: messages.length,
    })
  }

  return NextResponse.json({
    report: parsed,
    messageCount: messages.length,
    periodStart: since.toISOString(),
    periodEnd: new Date().toISOString(),
  })
}
