import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getInstanceStatus, sendText, getZapiConfig } from "@/lib/zapi"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const status = await getInstanceStatus()
  const cfg = getZapiConfig()

  return NextResponse.json({
    ...status,
    instanceId: cfg?.instanceId ?? null,
    webhookUrl: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook?secret=${process.env.ZAPI_WEBHOOK_SECRET}`
      : null,
  })
}

/** Envia uma mensagem de teste para confirmar que a instância está funcionando */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: "Informe o telefone" }, { status: 400 })

  try {
    const result = await sendText(
      phone,
      "✅ Conexão com a gráfica funcionando! Esta é uma mensagem de teste automática.",
    )
    return NextResponse.json({ ok: true, result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
