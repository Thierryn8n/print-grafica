// Serviço de Tarefas, Horários e Etiquetas nos cards do Kanban
import { createClient } from "@/lib/supabase/client"

export interface OrderTask {
  id: string
  orderId: string
  title: string
  done: boolean
  label?: string | null
  labelColor?: string | null
  dueAt?: string | null
  createdBy?: string | null
  createdByName?: string | null
  assignedTo?: string | null
  createdAt: string
  updatedAt: string
}

// Etiquetas pré-definidas para orientar os designers
export const TASK_LABELS: { value: string; label: string; color: string }[] = [
  { value: "arte", label: "Arte", color: "#6366f1" },
  { value: "exportacao", label: "Exportação", color: "#0ea5e9" },
  { value: "vetorizacao", label: "Vetorização", color: "#8b5cf6" },
  { value: "revisao", label: "Revisão", color: "#f59e0b" },
  { value: "urgente", label: "Urgente", color: "#ef4444" },
  { value: "aguardando", label: "Aguardando", color: "#64748b" },
  { value: "aprovado", label: "Aprovado", color: "#22c55e" },
  { value: "producao", label: "Produção", color: "#14b8a6" },
]

export function getLabelColor(value?: string | null): string {
  if (!value) return "#64748b"
  return TASK_LABELS.find((l) => l.value === value)?.color ?? value
}

function rowToTask(row: any): OrderTask {
  return {
    id: row.id,
    orderId: row.order_id,
    title: row.title,
    done: row.done,
    label: row.label,
    labelColor: row.label_color,
    dueAt: row.due_at,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class TaskService {
  private supabase = createClient()

  async list(orderId: string): Promise<OrderTask[]> {
    const { data, error } = await this.supabase
      .from("order_tasks")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
    if (error) throw error
    return (data || []).map(rowToTask)
  }

  async create(input: {
    orderId: string
    title: string
    label?: string | null
    dueAt?: string | null
    assignedTo?: string | null
    createdByName?: string | null
  }): Promise<OrderTask> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id
    const { data, error } = await this.supabase
      .from("order_tasks")
      .insert({
        order_id: input.orderId,
        title: input.title,
        label: input.label ?? null,
        label_color: input.label ? getLabelColor(input.label) : null,
        due_at: input.dueAt ?? null,
        assigned_to: input.assignedTo ?? null,
        created_by: userId,
        created_by_name: input.createdByName ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return rowToTask(data)
  }

  async toggle(id: string, done: boolean): Promise<void> {
    const { error } = await this.supabase
      .from("order_tasks")
      .update({ done, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from("order_tasks").delete().eq("id", id)
    if (error) throw error
  }

  // Contagem de tarefas por pedido (para exibir no card do kanban)
  async countsByOrders(orderIds: string[]): Promise<Record<string, { total: number; done: number }>> {
    if (orderIds.length === 0) return {}
    const { data, error } = await this.supabase
      .from("order_tasks")
      .select("order_id, done")
      .in("order_id", orderIds)
    if (error) throw error
    const counts: Record<string, { total: number; done: number }> = {}
    for (const row of data || []) {
      const c = counts[row.order_id] || { total: 0, done: 0 }
      c.total += 1
      if (row.done) c.done += 1
      counts[row.order_id] = c
    }
    return counts
  }

  // Meta para o card do kanban: contagem + etiquetas distintas (pendentes)
  async metaByOrders(
    orderIds: string[],
  ): Promise<Record<string, { total: number; done: number; labels: { label: string; color: string }[] }>> {
    if (orderIds.length === 0) return {}
    const { data, error } = await this.supabase
      .from("order_tasks")
      .select("order_id, done, label, label_color")
      .in("order_id", orderIds)
    if (error) throw error
    const meta: Record<string, { total: number; done: number; labels: { label: string; color: string }[] }> = {}
    for (const row of data || []) {
      const m = meta[row.order_id] || { total: 0, done: 0, labels: [] }
      m.total += 1
      if (row.done) m.done += 1
      if (row.label && !row.done && !m.labels.some((l) => l.label === row.label)) {
        m.labels.push({ label: row.label, color: row.label_color || getLabelColor(row.label) })
      }
      meta[row.order_id] = m
    }
    return meta
  }

  // Realtime: assina mudanças nas tarefas de um pedido
  subscribe(orderId: string, onChange: () => void) {
    const channel = this.supabase
      .channel(`order_tasks_${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_tasks", filter: `order_id=eq.${orderId}` },
        () => onChange()
      )
      .subscribe()
    return () => {
      this.supabase.removeChannel(channel)
    }
  }
}

export const taskService = new TaskService()
