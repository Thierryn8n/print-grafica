import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, createAdminClient, logApiCall, jsonError } from "@/lib/api/auth"

// GET /api/v1/orders — lista pedidos (escopo: read)
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req, "read")
  const ip = req.headers.get("x-forwarded-for") ?? undefined
  if (!auth.ok) {
    await logApiCall(null, "GET", "/api/v1/orders", auth.status ?? 401, ip)
    return jsonError(auth.error!, auth.status ?? 401)
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)

  const supabase = createAdminClient()
  let query = supabase
    .from("orders")
    .select("id, order_number, client_name, status, product_type, quantity, total_value, deadline, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) {
    await logApiCall(auth.token!.id, "GET", "/api/v1/orders", 500, ip)
    return jsonError(error.message, 500)
  }

  await logApiCall(auth.token!.id, "GET", "/api/v1/orders", 200, ip)
  return NextResponse.json({ count: data.length, data })
}

// POST /api/v1/orders — cria pedido (escopo: write)
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, "write")
  const ip = req.headers.get("x-forwarded-for") ?? undefined
  if (!auth.ok) {
    await logApiCall(null, "POST", "/api/v1/orders", auth.status ?? 401, ip)
    return jsonError(auth.error!, auth.status ?? 401)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError("Corpo JSON inválido", 400)
  }

  if (!body.client_name || !body.product_type) {
    return jsonError("Campos obrigatórios: client_name, product_type", 400)
  }

  const supabase = createAdminClient()
  const orderNumber = `API${Date.now().toString().slice(-8)}`
  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      client_name: body.client_name,
      client_phone: body.client_phone ?? null,
      product_type: body.product_type,
      quantity: body.quantity ?? 1,
      status: body.status ?? "briefing",
      priority: body.priority ?? "media",
      deadline: body.deadline ?? null,
      total_value: body.total_value ?? 0,
    })
    .select()
    .single()

  if (error) {
    await logApiCall(auth.token!.id, "POST", "/api/v1/orders", 500, ip)
    return jsonError(error.message, 500)
  }

  await logApiCall(auth.token!.id, "POST", "/api/v1/orders", 201, ip)
  return NextResponse.json({ data }, { status: 201 })
}
