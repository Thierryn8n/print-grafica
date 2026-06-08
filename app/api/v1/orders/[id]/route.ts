import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, createAdminClient, logApiCall, jsonError } from "@/lib/api/auth"

// GET /api/v1/orders/[id] — detalhe do pedido com itens (escopo: read)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authenticateRequest(req, "read")
  const ip = req.headers.get("x-forwarded-for") ?? undefined
  const endpoint = `/api/v1/orders/${id}`
  if (!auth.ok) {
    await logApiCall(null, "GET", endpoint, auth.status ?? 401, ip)
    return jsonError(auth.error!, auth.status ?? 401)
  }

  const supabase = createAdminClient()
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle()
  if (error) {
    await logApiCall(auth.token!.id, "GET", endpoint, 500, ip)
    return jsonError(error.message, 500)
  }
  if (!order) {
    await logApiCall(auth.token!.id, "GET", endpoint, 404, ip)
    return jsonError("Pedido não encontrado", 404)
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("sort_order", { ascending: true })

  await logApiCall(auth.token!.id, "GET", endpoint, 200, ip)
  return NextResponse.json({ data: { ...order, items: items ?? [] } })
}
