import { createClient } from "@/lib/supabase/client"
import type { OrderItem, ImportBatch, ImportError, ImportSourceType } from "@/lib/types"

/** Lista os itens/jogadores de um pedido. */
export async function listOrderItems(orderId: string): Promise<OrderItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as OrderItem[]
}

/** Cria um item individual. */
export async function createOrderItem(item: Partial<OrderItem> & { order_id: string }): Promise<OrderItem> {
  const supabase = createClient()
  const { data, error } = await supabase.from("order_items").insert(item).select().single()
  if (error) throw error
  return data as OrderItem
}

/** Atualiza um item. */
export async function updateOrderItem(id: string, patch: Partial<OrderItem>): Promise<OrderItem> {
  const supabase = createClient()
  const { data, error } = await supabase.from("order_items").update(patch).eq("id", id).select().single()
  if (error) throw error
  return data as OrderItem
}

/** Remove um item. */
export async function deleteOrderItem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("order_items").delete().eq("id", id)
  if (error) throw error
}

/** Edição em massa: aplica o mesmo patch a vários itens. */
export async function bulkUpdateOrderItems(ids: string[], patch: Partial<OrderItem>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("order_items").update(patch).in("id", ids)
  if (error) throw error
}

export interface CommitImportParams {
  orderId: string
  rows: Record<string, string | number>[]
  errors: ImportError[]
  sourceType: ImportSourceType
  fileName?: string
  columnMapping: Record<string, string>
  totalRows: number
}

/**
 * Persiste um lote de importação:
 * 1. cria o registro em import_batches
 * 2. insere os order_items vinculados ao lote
 * Retorna o batch criado (permite rollback posterior).
 */
export async function commitImport(params: CommitImportParams): Promise<ImportBatch> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      order_id: params.orderId,
      imported_by: user?.id ?? null,
      source_type: params.sourceType,
      file_name: params.fileName ?? null,
      target: "order_items",
      total_rows: params.totalRows,
      success_count: params.rows.length,
      error_count: params.errors.length,
      status: params.errors.length > 0 ? "partial" : "completed",
      errors: params.errors,
      column_mapping: params.columnMapping,
    })
    .select()
    .single()
  if (batchError) throw batchError

  if (params.rows.length > 0) {
    const items = params.rows.map((r, i) => ({
      order_id: params.orderId,
      import_batch_id: batch.id,
      player_name: (r.player_name as string) ?? null,
      player_number: (r.player_number as string) ?? null,
      size: (r.size as string) ?? null,
      position: (r.position as string) ?? null,
      category: (r.category as string) ?? null,
      team_name: (r.team_name as string) ?? null,
      sector: (r.sector as string) ?? null,
      role: (r.role as string) ?? null,
      sponsor: (r.sponsor as string) ?? null,
      quantity: (r.quantity as number) ?? 1,
      notes: (r.notes as string) ?? null,
      sort_order: i,
    }))
    const { error: itemsError } = await supabase.from("order_items").insert(items)
    if (itemsError) {
      // rollback do batch se a inserção dos itens falhar
      await supabase.from("import_batches").delete().eq("id", batch.id)
      throw itemsError
    }
  }

  // Log na timeline do pedido
  await supabase.from("activity_logs").insert({
    order_id: params.orderId,
    user_id: user?.id ?? null,
    action: "import_completed",
    description: `Importação de ${params.rows.length} item(ns) via ${params.sourceType}`,
    metadata: { batch_id: batch.id, errors: params.errors.length },
  })

  return batch as ImportBatch
}

/** Lista os lotes de importação de um pedido. */
export async function listImportBatches(orderId: string): Promise<ImportBatch[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as ImportBatch[]
}

/** Rollback: remove todos os itens de um lote e marca o lote como revertido. */
export async function rollbackImport(batchId: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: batch } = await supabase
    .from("import_batches")
    .select("order_id")
    .eq("id", batchId)
    .single()

  const { error: delError } = await supabase.from("order_items").delete().eq("import_batch_id", batchId)
  if (delError) throw delError

  const { error: updError } = await supabase
    .from("import_batches")
    .update({ status: "rolled_back" })
    .eq("id", batchId)
  if (updError) throw updError

  if (batch?.order_id) {
    await supabase.from("activity_logs").insert({
      order_id: batch.order_id,
      user_id: user?.id ?? null,
      action: "import_rolled_back",
      description: "Importação revertida (rollback)",
      metadata: { batch_id: batchId },
    })
  }
}
