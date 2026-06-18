import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Lista as conversas do WhatsApp (agrupadas por telefone) da empresa do
 * usuário logado, com a última mensagem de cada uma.
 */
export async function GET() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  // Busca as mensagens (RLS garante que só vêm as da empresa do usuário).
  const { data: messages, error } = await supabase
    .from("whatsapp_messages")
    .select("chat_phone, sender_name, body, message_type, from_me, message_timestamp")
    .order("message_timestamp", { ascending: false })
    .limit(2000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Agrupa por telefone, mantendo a última mensagem.
  const map = new Map<
    string,
    { chat_phone: string; sender_name: string | null; last_body: string | null; last_type: string; last_at: string; count: number }
  >()

  for (const m of messages ?? []) {
    const existing = map.get(m.chat_phone)
    if (!existing) {
      map.set(m.chat_phone, {
        chat_phone: m.chat_phone,
        sender_name: m.sender_name,
        last_body: m.body,
        last_type: m.message_type,
        last_at: m.message_timestamp,
        count: 1,
      })
    } else {
      existing.count += 1
      if (!existing.sender_name && m.sender_name) existing.sender_name = m.sender_name
    }
  }

  const conversations = Array.from(map.values()).sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime(),
  )

  return NextResponse.json({ conversations })
}
