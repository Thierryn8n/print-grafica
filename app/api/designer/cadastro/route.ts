import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST público: auto-cadastro de designer via link de convite.
// A segurança é o código de convite válido (não exige login de admin).
// O código carrega a gráfica (company_id) e o nível, então o designer
// já fica vinculado e aprovado automaticamente.
export async function POST(request: Request) {
  const body = await request.json()
  const code = (body.code || "").trim().toUpperCase()
  const fullName = (body.fullName || "").trim()
  const email = (body.email || "").trim().toLowerCase()
  const phone = (body.phone || "").replace(/\D/g, "")
  const password = body.password || ""

  if (!code) {
    return NextResponse.json({ error: "Link de convite inválido" }, { status: 400 })
  }
  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 })
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

  // 2) Email já cadastrado?
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um cadastro com este email. Faça login com seu email e senha." },
      { status: 409 },
    )
  }

  // 3) Cria o usuário no auth, já confirmado
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, role: "designer" },
  })

  if (createErr || !created.user) {
    const msg = createErr?.message?.includes("already")
      ? "Este email já está cadastrado. Faça login."
      : createErr?.message || "Erro ao criar o cadastro"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 4) Resgata o código: vincula à gráfica, aplica nível e aprova o designer
  const { error: redeemErr } = await admin.rpc("redeem_invite_code", {
    p_code: code,
    p_user_id: created.user.id,
    p_full_name: fullName,
    p_phone: phone,
  })

  if (redeemErr) {
    // Reverte a criação para não deixar usuário órfão sem vínculo
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: "Não foi possível concluir o cadastro." }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
