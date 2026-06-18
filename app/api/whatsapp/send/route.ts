import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendText } from "@/lib/zapi"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { phone, message } = await req.json()
  if (!phone || !message?.trim()) {
    return NextResponse.json({ error: "phone e message são obrigatórios" }, { status: 400 })
  }

  // Busca company_id do usuário logado
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", auth.user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 400 })
  }

  // Envia via Z-API
  try {
    await sendText(phone, message.trim())
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }

  // Salva no banco como mensagem "de mim" (enviada pelo atendente)
  const admin = createAdminClient()
  await admin.from("whatsapp_messages").insert({
    company_id: profile.company_id,
    message_id: `manual-${Date.now()}`,
    chat_phone: phone,
    sender_name: "Atendente",
    from_me: true,
    message_type: "text",
    body: message.trim(),
    message_timestamp: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
