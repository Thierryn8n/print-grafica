import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeZapiWebhook } from "@/lib/zapi"

/**
 * Webhook "Ao receber" da Z-API.
 *
 * Configure na Z-API a URL:
 *   https://SEU_DOMINIO/api/whatsapp/webhook?secret=SEU_SEGREDO&company=COMPANY_ID
 *
 * - `secret` precisa bater com ZAPI_WEBHOOK_SECRET (proteção contra chamadas externas).
 * - `company` é opcional: se houver apenas uma empresa cadastrada, ela é usada
 *   automaticamente.
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  const expected = process.env.ZAPI_WEBHOOK_SECRET

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const normalized = normalizeZapiWebhook(payload)
  if (!normalized) {
    // Evento que não é mensagem (status, presença, etc.) — apenas confirmamos.
    return NextResponse.json({ ok: true, ignored: true })
  }

  const supabase = createAdminClient()

  // Resolve a empresa: usa o parâmetro ?company= ou a única empresa existente.
  let companyId = req.nextUrl.searchParams.get("company")
  if (!companyId) {
    const { data: companies } = await supabase.from("companies").select("id").limit(2)
    if (companies && companies.length === 1) {
      companyId = companies[0].id
    }
  }

  if (!companyId) {
    return NextResponse.json(
      { error: "company_id não resolvido. Adicione ?company=ID na URL do webhook." },
      { status: 400 },
    )
  }

  // Upsert idempotente (a Z-API pode reenviar o mesmo evento).
  const { error } = await supabase.from("whatsapp_messages").upsert(
    {
      company_id: companyId,
      message_id: normalized.messageId,
      chat_phone: normalized.chatPhone,
      sender_name: normalized.senderName,
      from_me: normalized.fromMe,
      message_type: normalized.messageType,
      body: normalized.body,
      media_url: normalized.mediaUrl,
      caption: normalized.caption,
      raw: payload,
      message_timestamp: normalized.messageTimestamp,
    },
    { onConflict: "company_id,message_id", ignoreDuplicates: true },
  )

  if (error) {
    console.log("[v0] erro ao salvar mensagem whatsapp:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// A Z-API pode fazer um GET de verificação ao salvar a URL.
export async function GET() {
  return NextResponse.json({ ok: true, service: "whatsapp-webhook" })
}
