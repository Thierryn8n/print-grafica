import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cpfToEmail, onlyDigits, isValidCPF } from "@/lib/ponto/utils"

// Garante que quem chama é um admin autenticado
async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, message: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, message: "Acesso restrito ao gerente" }
  }
  return { ok: true as const }
}

// GET: lista colaboradores
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, cpf, phone, status, role, created_at")
    .eq("role", "colaborador")
    .order("full_name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ colaboradores: data })
}

// POST: cria colaborador (nome, cpf, telefone, senha)
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const body = await request.json()
  const fullName = (body.fullName || "").trim()
  const cpf = onlyDigits(body.cpf || "")
  const phone = onlyDigits(body.phone || "")
  const password = body.password || ""

  if (!fullName || !cpf || !password) {
    return NextResponse.json({ error: "Nome, CPF e senha são obrigatórios" }, { status: 400 })
  }
  if (!isValidCPF(cpf)) {
    return NextResponse.json({ error: "CPF inválido" }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres" }, { status: 400 })
  }

  const admin = createAdminClient()

  // CPF já cadastrado?
  const { data: existing } = await admin.from("profiles").select("id").eq("cpf", cpf).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: "Já existe um colaborador com este CPF" }, { status: 409 })
  }

  // Cria o usuário no auth com email sintético, já confirmado
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: cpfToEmail(cpf),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, role: "colaborador", cpf },
  })

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message || "Erro ao criar usuário" },
      { status: 500 },
    )
  }

  // Garante os dados no profile (o trigger cria a linha; aqui completamos)
  const { error: profErr } = await admin
    .from("profiles")
    .update({ full_name: fullName, cpf, phone, role: "colaborador", status: "approved" })
    .eq("id", created.user.id)

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  return NextResponse.json({ id: created.user.id }, { status: 201 })
}

// DELETE: remove colaborador
export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
