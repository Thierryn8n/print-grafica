/**
 * GET  /api/whatsapp/agent-instructions — carrega as config do agente
 * POST /api/whatsapp/agent-instructions — salva as config do agente
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single()

  if (!profile?.company_id) return NextResponse.json({ error: "no company" }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from("system_settings")
    .select("agent_enabled, agent_instructions, agent_name, agent_tone")
    .eq("company_id", profile.company_id)
    .maybeSingle()

  return NextResponse.json(data || {
    agent_enabled: false,
    agent_name: "Atendente",
    agent_tone: "profissional",
    agent_instructions: "",
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single()

  if (!profile?.company_id) return NextResponse.json({ error: "no company" }, { status: 400 })

  const body = await req.json()

  const admin = createAdminClient()

  // Upsert das configurações do agente
  const { error } = await admin.from("system_settings").upsert(
    {
      company_id: profile.company_id,
      agent_enabled: body.agent_enabled ?? false,
      agent_name: body.agent_name || "Atendente",
      agent_tone: body.agent_tone || "profissional",
      agent_instructions: body.agent_instructions || "",
    },
    { onConflict: "company_id" },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
