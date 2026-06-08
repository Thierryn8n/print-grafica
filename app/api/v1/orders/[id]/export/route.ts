import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, createAdminClient, logApiCall, jsonError } from "@/lib/api/auth"
import { buildCorelExport, type CorelExportFormat } from "@/lib/integrations/coreldraw-export"
import type { OrderItem } from "@/lib/types"

// GET /api/v1/orders/[id]/export?format=csv|json|xml — exporta itens para CorelDRAW (escopo: export)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authenticateRequest(req, "export")
  const ip = req.headers.get("x-forwarded-for") ?? undefined
  const endpoint = `/api/v1/orders/${id}/export`
  if (!auth.ok) {
    await logApiCall(null, "GET", endpoint, auth.status ?? 401, ip)
    return jsonError(auth.error!, auth.status ?? 401)
  }

  const { searchParams } = new URL(req.url)
  const format = (searchParams.get("format") ?? "csv") as CorelExportFormat

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("sort_order", { ascending: true })

  if (error) {
    await logApiCall(auth.token!.id, "GET", endpoint, 500, ip)
    return jsonError(error.message, 500)
  }

  const { content, mime, ext } = buildCorelExport((data ?? []) as OrderItem[], format)
  await logApiCall(auth.token!.id, "GET", endpoint, 200, ip)
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="pedido-${id}.${ext}"`,
    },
  })
}
