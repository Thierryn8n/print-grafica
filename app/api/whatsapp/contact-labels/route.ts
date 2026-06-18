/**
 * POST   /api/whatsapp/contact-labels  — adiciona label a um contato
 * DELETE /api/whatsapp/contact-labels  — remove label de um contato
 * GET    /api/whatsapp/contact-labels?phone=xx — labels de um contato
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getCompanyId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()
  return p?.company_id ?? null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const phone = req.nextUrl.searchParams.get("phone")
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 })

  const { data, error } = await supabase
    .from("whatsapp_contact_labels")
    .select("label_id, whatsapp_labels(id, name, color)")
    .eq("company_id", companyId)
    .eq("chat_phone", phone)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ labels: data?.map((d: any) => d.whatsapp_labels) ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { phone, label_id } = await req.json()
  if (!phone || !label_id) return NextResponse.json({ error: "phone and label_id required" }, { status: 400 })

  const { error } = await supabase
    .from("whatsapp_contact_labels")
    .upsert({ company_id: companyId, chat_phone: phone, label_id }, { onConflict: "company_id,chat_phone,label_id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { phone, label_id } = await req.json()
  const { error } = await supabase
    .from("whatsapp_contact_labels")
    .delete()
    .eq("company_id", companyId)
    .eq("chat_phone", phone)
    .eq("label_id", label_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
