"use client"

import { useEffect, useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Order, OrderStatus, Profile } from "@/lib/types"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "@/lib/types"
import { Calendar, Package, User, GripVertical, AlertTriangle, ListChecks } from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { taskService } from "@/lib/tasks/task-service"

type TaskMeta = { total: number; done: number; labels: { label: string; color: string }[] }

function currency(v?: number | null) {
  if (v == null) return null
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

interface KanbanCardProps {
  order: Order
  designers?: Profile[]
  onSelect: (order: Order) => void
  isOverlay?: boolean
  taskMeta?: TaskMeta
}

function OrderKanbanCard({ order, designers, onSelect, isOverlay, taskMeta }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: order.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const designer = designers?.find((d) => d.id === order.designer_id)
  const deadline = order.deadline ? new Date(order.deadline) : null
  const overdue = deadline && isPast(deadline) && !isToday(deadline) && order.status !== "finalizado"
  const dueToday = deadline && isToday(deadline)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border border-border bg-card shadow-sm",
        "transition-all hover:shadow-md hover:border-primary/40",
        isDragging && "opacity-40",
        isOverlay && "shadow-xl ring-2 ring-primary rotate-2 cursor-grabbing",
      )}
    >
      {/* faixa de prioridade */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1 rounded-l-xl",
          PRIORITY_COLORS[order.priority],
        )}
        aria-hidden
      />

      <div className="p-3 pl-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelect(order)}
            className="flex-1 min-w-0 text-left"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              #{order.order_number}
            </span>
            <h4 className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {order.client_name}
            </h4>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              <span className="truncate">
                {order.product_type} • {order.quantity}un
              </span>
            </p>
          </button>

          {/* alça de arrastar */}
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 active:cursor-grabbing touch-none"
            aria-label="Arrastar pedido"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        {/* etiquetas das tarefas */}
        {taskMeta && taskMeta.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {taskMeta.labels.slice(0, 4).map((l) => (
              <span
                key={l.label}
                className="h-1.5 w-7 rounded-full"
                style={{ backgroundColor: l.color }}
                aria-hidden
              />
            ))}
          </div>
        )}

        {/* designer (admin) */}
        {designer && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
              {designer.full_name?.[0]?.toUpperCase() ?? <User className="h-3 w-3" />}
            </div>
            <span className="truncate text-xs text-muted-foreground">{designer.full_name}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium text-white",
              PRIORITY_COLORS[order.priority],
            )}
          >
            {PRIORITY_LABELS[order.priority]}
          </span>

          <div className="flex items-center gap-2">
            {taskMeta && taskMeta.total > 0 && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  taskMeta.done === taskMeta.total
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <ListChecks className="h-3 w-3" />
                {taskMeta.done}/{taskMeta.total}
              </span>
            )}
            {currency(order.total_value) && (
              <span className="text-[11px] font-semibold text-primary">
                {currency(order.total_value)}
              </span>
            )}
            {deadline && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  overdue
                    ? "bg-destructive/15 text-destructive"
                    : dueToday
                      ? "bg-amber-500/15 text-amber-600"
                      : "text-muted-foreground",
                )}
              >
                {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {format(deadline, "dd/MM")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ColumnProps {
  status: OrderStatus
  orders: Order[]
  designers?: Profile[]
  onSelect: (order: Order) => void
  taskMetas: Record<string, TaskMeta>
}

function KanbanColumn({ status, orders, designers, onSelect, taskMetas }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const dotColor = ORDER_STATUS_COLORS[status]

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-border bg-card px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", dotColor)} aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">{ORDER_STATUS_LABELS[status]}</h3>
        </div>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground">
          {orders.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-b-xl border border-t-0 border-border bg-muted/30 p-2 transition-colors",
          "min-h-[60vh]",
          isOver && "bg-primary/10 ring-2 ring-inset ring-primary/40",
        )}
      >
        <SortableContext items={orders.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {orders.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground">
              <Package className="h-6 w-6 opacity-40" />
              <span className="text-xs">Solte aqui</span>
            </div>
          ) : (
            orders.map((order) => (
              <OrderKanbanCard
                key={order.id}
                order={order}
                designers={designers}
                onSelect={onSelect}
                taskMeta={taskMetas[order.id]}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}

interface OrderKanbanProps {
  orders: Order[]
  columns: OrderStatus[]
  designers?: Profile[]
  onMove: (order: Order, newStatus: OrderStatus) => void
  onSelect: (order: Order) => void
}

export function OrderKanban({ orders, columns, designers, onMove, onSelect }: OrderKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [taskMetas, setTaskMetas] = useState<Record<string, TaskMeta>>({})

  const orderIdsKey = orders.map((o) => o.id).join(",")

  useEffect(() => {
    let active = true
    const ids = orders.map((o) => o.id)
    taskService
      .metaByOrders(ids)
      .then((meta) => {
        if (active) setTaskMetas(meta)
      })
      .catch((e) => console.log("[v0] erro ao carregar meta de tarefas:", e?.message))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdsKey])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const getColumnOrders = (status: OrderStatus) => orders.filter((o) => o.status === status)
  const activeOrder = activeId ? orders.find((o) => o.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const order = orders.find((o) => o.id === active.id)
    if (!order) return

    // o destino pode ser uma coluna (status) ou outro card
    let target = over.id as string
    if (!columns.includes(target as OrderStatus)) {
      const overOrder = orders.find((o) => o.id === over.id)
      if (overOrder) target = overOrder.status
    }

    if (columns.includes(target as OrderStatus) && target !== order.status) {
      onMove(order, target as OrderStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            orders={getColumnOrders(status)}
            designers={designers}
            onSelect={onSelect}
            taskMetas={taskMetas}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOrder ? (
          <OrderKanbanCard order={activeOrder} designers={designers} onSelect={() => {}} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
