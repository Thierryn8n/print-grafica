import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getQrCode, getInstanceStatus, disconnectInstance } from "@/lib/zapi"

// GET — retorna QR code + status atual
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const [qr, status] = await Promise.all([getQrCode(), getInstanceStatus()])

  return NextResponse.json({
    qr: qr?.value ?? null,          // data:image/png;base64,... ou null se já conectado
    connected: status.connected,
    status: status.status,
    phone: status.phone ?? null,
  })
}

// DELETE — desconecta o WhatsApp
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const ok = await disconnectInstance()
  return NextResponse.json({ ok })
}
