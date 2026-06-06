import { createClient } from "@/lib/supabase/client"
import type { Order, OrderStatus, ActivityLog } from "@/lib/types"
import { ORDER_STATUS_LABELS } from "@/lib/types"

export interface OrderFilters {
  search?: string
  status?: OrderStatus | "all"
  priority?: string
  designerId?: string
}

/** Lista pedidos com filtros opcionais e join de designer. */
export async function listOrders(filters: OrderFilters = {}): Promise<Order[]> {
  const supabase = createClient()
  let query = supabase
    .from("orders")
    .select("*, designer:designer_id(id, full_name, avatar_url)")
    .order("created_at", { ascending: false })

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority)
  }
  if (filters.designerId && filters.designerId !== "all") {
    query = query.eq("designer_id", filters.designerId)
  }
  if (filters.search) {
    const term = `%${filters.search}%`
    query = query.or(
      `order_number.ilike.${term},client_name.ilike.${term},team_name.ilike.${term},product_type.ilike.${term}`
    )
  }

  const { data, error } = await query
  if (error) {
    console.error("[v0] listOrders error:", error.message)
    return []
  }
  return (data as Order[]) ?? []
}

/** Busca um pedido pelo id com joins de designer e arquivos. */
export async function getOrder(id: string): Promise<Order | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*, designer:designer_id(id, full_name, avatar_url, email)")
    .eq("id", id)
    .single()

  if (error) {
    console.error("[v0] getOrder error:", error.message)
    return null
  }
  return data as Order
}

/** Retorna a timeline (histórico de atividades) de um pedido. */
export async function getOrderTimeline(orderId: string): Promise<ActivityLog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*, user:user_id(id, full_name, avatar_url)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] getOrderTimeline error:", error.message)
    return []
  }
  return (data as ActivityLog[]) ?? []
}

/** Registra uma entrada na timeline do pedido. */
export async function logOrderActivity(
  orderId: string,
  action: string,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("activity_logs").insert({
    order_id: orderId,
    user_id: user?.id ?? null,
    action,
    description,
    metadata,
  })
}

/** Atualiza o status do pedido e registra na timeline. */
export async function updateOrderStatus(
  order: Order,
  newStatus: OrderStatus
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const updateData: Partial<Order> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }
  if (newStatus === "aprovacao" && !order.approval_token) {
    updateData.approval_token = crypto.randomUUID()
  }

  const { error } = await supabase.from("orders").update(updateData).eq("id", order.id)
  if (error) return { error: error.message }

  await logOrderActivity(
    order.id,
    "status_changed",
    `Status alterado de ${ORDER_STATUS_LABELS[order.status]} para ${ORDER_STATUS_LABELS[newStatus]}`,
    { from: order.status, to: newStatus }
  )
  return { error: null }
}

/** Atualiza campos arbitrários do pedido e registra na timeline. */
export async function updateOrder(
  orderId: string,
  patch: Partial<Order>,
  logDescription?: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from("orders")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", orderId)

  if (error) return { error: error.message }

  if (logDescription) {
    await logOrderActivity(orderId, "order_updated", logDescription, patch as Record<string, unknown>)
  }
  return { error: null }
}

/** Exclui um pedido. */
export async function deleteOrder(orderId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from("orders").delete().eq("id", orderId)
  return { error: error?.message ?? null }
}

/** Soma total de itens por grade de tamanho. */
export function totalSizes(order: Order): number {
  return (
    (order.size_pp || 0) +
    (order.size_p || 0) +
    (order.size_m || 0) +
    (order.size_g || 0) +
    (order.size_gg || 0) +
    (order.size_xg || 0) +
    (order.size_xgg || 0) +
    (order.size_infantil || 0)
  )
}
