// Query Optimizer for Supabase
// Provides utilities to optimize database queries and avoid N+1 problems

import { createClient } from "@/lib/supabase/server"

// Select only the fields you need
export async function fetchOrdersMinimal() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      client_name,
      status,
      priority,
      deadline,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error
  return data
}

// Fetch orders with client data in a single query (avoid N+1)
export async function fetchOrdersWithClients() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      priority,
      deadline,
      created_at,
      client:clients (
        id,
        name,
        email,
        phone
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error
  return data
}

// Fetch orders with files in a single query
export async function fetchOrdersWithFiles(orderId?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      priority,
      deadline,
      order_files (
        id,
        file_name,
        file_url,
        file_type,
        is_final,
        created_at
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  if (orderId) {
    query = query.eq("id", orderId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// Fetch orders with activity logs in a single query
export async function fetchOrdersWithActivity(orderId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      activity_logs (
        id,
        action,
        description,
        created_at,
        user:profiles (
          full_name
        )
      )
    `)
    .eq("id", orderId)
    .single()

  if (error) throw error
  return data
}

// Batch fetch clients by IDs
export async function fetchClientsByIds(clientIds: string[]) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, phone")
    .in("id", clientIds)

  if (error) throw error
  return data
}

// Count records without fetching data
export async function countOrders(filters?: {
  status?: string
  priority?: string
  client_id?: string
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority)
  }
  if (filters?.client_id) {
    query = query.eq("client_id", filters.client_id)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}

// Fetch with pagination
export async function fetchPaginatedOrders(
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    status?: string
    priority?: string
  }
) {
  const supabase = await createClient()
  
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      client_name,
      status,
      priority,
      deadline,
      created_at
    `)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// Fetch with specific fields only
export async function fetchOrderSummary(orderId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      client_name,
      status,
      priority,
      deadline,
      total_value,
      custo_total,
      lucro_estimado
    `)
    .eq("id", orderId)
    .single()

  if (error) throw error
  return data
}

// Use RPC for complex queries (server-side)
export async function fetchOrderStatsRPC() {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc("get_order_stats")

  if (error) throw error
  return data
}

// Fetch with caching wrapper
import supabaseCache from "@/lib/cache/supabase-cache"

export async function fetchOrdersCached() {
  return supabaseCache.getOrFetch(
    "orders:all",
    fetchOrdersMinimal,
    5 * 60 * 1000 // 5 minutes
  )
}

// Invalidate cache when data changes
export function invalidateOrdersCache() {
  supabaseCache.invalidatePattern("orders:")
}
