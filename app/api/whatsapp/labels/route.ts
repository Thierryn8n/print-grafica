/**
 * GET  /api/whatsapp/labels  — lista labels da empresa
 * POST /api/whatsapp/labels  — cria nova label
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).single()
  if (!profile) return NextResponse.json({ error: "no company" }, { status: 403 })

  const { data, error } = await supabase
    .from("whatsapp_labels")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("sort_order")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ labels: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).single()
  if (!profile) return NextResponse.json({ error: "no company" }, { status: 403 })

  const body = await req.json()
  const { name, color } = body
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const { data, error } = await supabase
    .from("whatsapp_labels")
    .insert({ company_id: profile.company_id, name: name.trim(), color: color || "#6366f1" })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ label: data })
}
