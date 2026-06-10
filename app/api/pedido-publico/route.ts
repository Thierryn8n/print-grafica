import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type ItemPayload = {
  productType: string // "completo" | "camisa" | "short"
  fabric?: string
  shirtType?: string
  shortType?: string
  quantity: number
  sizes: Record<string, number>
  colors?: string[]
  description?: string
}

type Payload = {
  token: string
  client: {
    name: string
    phone: string
    email?: string
    document?: string
    address?: string
    notes?: string
  }
  items: ItemPayload[]
  generalNotes?: string
}

function sanitizePhone(v: string) {
  return (v || "").replace(/\D/g, "")
}

async function generateOrderNumber(supabase: ReturnType<typeof createAdminClient>) {
  const date = new Date()
  const prefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .like("order_number", `${prefix}%`)
  const sequence = String((count || 0) + 1).padStart(4, "0")
  return `${prefix}${sequence}`
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload

    if (!body?.token) {
      return NextResponse.json({ error: "Link inválido." }, { status: 400 })
    }
    if (!body.client?.name || !body.client?.phone) {
      return NextResponse.json({ error: "Informe nome e telefone." }, { status: 400 })
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Adicione pelo menos um item ao pedido." }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Valida o link
    const { data: link, error: linkError } = await supabase
      .from("order_links")
      .select("*")
      .eq("token", body.token)
      .maybeSingle()

    if (linkError || !link) {
      return NextResponse.json({ error: "Link de pedido não encontrado." }, { status: 404 })
    }
    if (link.status === "completed") {
      return NextResponse.json({ error: "Este link já foi utilizado." }, { status: 409 })
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "Este link expirou." }, { status: 410 })
    }

    const phone = sanitizePhone(body.client.phone)

    // 2. Cadastra ou atualiza o cliente (vinculado à empresa do link)
    let clientId = link.client_id as string | null

    if (!clientId) {
      // Tenta achar cliente existente pelo telefone na mesma empresa
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("company_id", link.company_id)
        .eq("phone", phone)
        .maybeSingle()
      clientId = existing?.id ?? null
    }

    const clientPayload = {
      name: body.client.name.trim(),
      phone,
      whatsapp: phone,
      email: body.client.email?.trim() || null,
      document: body.client.document?.trim() || null,
      address: body.client.address?.trim() || null,
      notes: body.client.notes?.trim() || null,
      company_id: link.company_id,
      created_by: link.created_by,
    }

    if (clientId) {
      await supabase.from("clients").update(clientPayload).eq("id", clientId)
    } else {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert(clientPayload)
        .select("id")
        .single()
      if (clientErr) {
        return NextResponse.json({ error: "Erro ao salvar seus dados." }, { status: 500 })
      }
      clientId = newClient.id
    }

    // 3. Monta o pedido a partir dos itens
    const orderNumber = await generateOrderNumber(supabase)

    const totalQuantity = body.items.reduce((sum, it) => {
      const sizesTotal = Object.values(it.sizes || {}).reduce((s, n) => s + (Number(n) || 0), 0)
      return sum + (sizesTotal || Number(it.quantity) || 0)
    }, 0)

    // Agrega tamanhos de todos os itens (size_breakdown jsonb)
    const sizeBreakdown: Record<string, number> = {}
    const allColors: string[] = []
    for (const it of body.items) {
      for (const [size, qty] of Object.entries(it.sizes || {})) {
        const n = Number(qty) || 0
        if (n > 0) sizeBreakdown[size] = (sizeBreakdown[size] || 0) + n
      }
      for (const c of it.colors || []) {
        if (c && !allColors.includes(c)) allColors.push(c)
      }
    }

    const primary = body.items[0]
    const productTypeLabel =
      primary.productType === "completo"
        ? "Conjunto completo"
        : primary.productType === "short"
          ? "Short"
          : "Camisa"

    const title = `${productTypeLabel} - ${body.client.name.trim()}`

    const descriptionLines = body.items.map((it, idx) => {
      const sizesStr = Object.entries(it.sizes || {})
        .filter(([, n]) => Number(n) > 0)
        .map(([s, n]) => `${s}:${n}`)
        .join(", ")
      const parts = [
        `Item ${idx + 1}: ${it.productType}`,
        it.fabric ? `Tecido: ${it.fabric}` : "",
        it.shirtType ? `Camisa: ${it.shirtType}` : "",
        it.shortType ? `Short: ${it.shortType}` : "",
        sizesStr ? `Tamanhos: ${sizesStr}` : "",
        it.colors?.length ? `Cores: ${it.colors.join(", ")}` : "",
        it.description ? `Obs: ${it.description}` : "",
      ].filter(Boolean)
      return parts.join(" | ")
    })
    if (body.generalNotes) descriptionLines.push(`Observações gerais: ${body.generalNotes}`)

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        title,
        client_id: clientId,
        client_name: body.client.name.trim(),
        client_phone: phone,
        product_type: primary.productType,
        fabric: primary.fabric || null,
        quantity: totalQuantity,
        size_breakdown: sizeBreakdown,
        colors: allColors,
        description: descriptionLines.join("\n"),
        notes: body.generalNotes || null,
        status: "novo-pedido",
        production_stage: "design1",
        priority: "normal",
        company_id: link.company_id,
        created_by: link.created_by,
        metadata: { source: "formulario-cliente", items: body.items, order_link_token: body.token },
      })
      .select("id, tracking_token, order_number")
      .single()

    if (orderErr || !order) {
      console.log("[v0] erro ao criar pedido público:", orderErr?.message)
      return NextResponse.json({ error: "Erro ao registrar o pedido." }, { status: 500 })
    }

    // 4. Marca o link como concluído
    await supabase
      .from("order_links")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        order_id: order.id,
        client_id: clientId,
        client_name: body.client.name.trim(),
        client_phone: phone,
      })
      .eq("id", link.id)

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      trackingToken: order.tracking_token,
    })
  } catch (err) {
    console.log("[v0] exceção no pedido público:", err)
    return NextResponse.json({ error: "Erro inesperado." }, { status: 500 })
  }
}
