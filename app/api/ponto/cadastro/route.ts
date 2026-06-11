import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cpfToEmail, onlyDigits, isValidCPF } from "@/lib/ponto/utils"

// POST público: auto-cadastro de colaborador via link de convite.
// A segurança é o código de convite válido (não exige login de admin).
export async function POST(request: Request) {
  const body = await request.json()
  const code = (body.code || "").trim().toUpperCase()
  const fullName = (body.fullName || "").trim()
  const cpf = onlyDigits(body.cpf || "")
  const phone = onlyDigits(body.phone || "")
  const password = body.password || ""

  if (!code) {
    return NextResponse.json({ error: "Link de convite inválido" }, { status: 400 })
  }
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

  // 1) Valida o código de convite
  const { data: valid, error: valErr } = await admin.rpc("validate_invite_code", { p_code: code })
  if (valErr) {
    return NextResponse.json({ error: "Erro ao validar o convite" }, { status: 500 })
  }
  if (valid !== true) {
    return NextResponse.json(
      { error: "Este link de convite é inválido, expirou ou atingiu o limite de uso." },
      { status: 403 },
    )
  }

  // 2) CPF já cadastrado?
  const { data: existing } = await admin.from("profiles").select("id").eq("cpf", cpf).maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um cadastro com este CPF. Faça login com seu CPF e senha." },
      { status: 409 },
    )
  }

  // 3) Cria o usuário no auth com email sintético (CPF), já confirmado
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: cpfToEmail(cpf),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, role: "colaborador", cpf },
  })

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message || "Erro ao criar o cadastro" },
      { status: 500 },
    )
  }

  // 4) Resgata o código: incrementa uso, define role/dados e aprova o colaborador
  const { error: redeemErr } = await admin.rpc("redeem_invite_code", {
    p_code: code,
    p_user_id: created.user.id,
    p_full_name: fullName,
    p_cpf: cpf,
    p_phone: phone,
  })

  if (redeemErr) {
    // Reverte a criação para não deixar usuário órfão sem vínculo
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: "Não foi possível concluir o cadastro." }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
