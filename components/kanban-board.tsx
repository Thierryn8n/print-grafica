'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useAppStore, Order, OrderStatus, getStatusLabel, getServiceLabel, getPriorityLabel } from '@/lib/store'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { OrderModal } from './order-modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, X } from 'lucide-react'

const COLUMNS: { id: OrderStatus; title: string; color: string }[] = [
  { id: 'novo-pedido', title: 'Novo Pedido', color: 'bg-slate-500' },
  { id: 'aguardando-info', title: 'Aguardando Info', color: 'bg-yellow-500' },
  { id: 'em-criacao', title: 'Em Criação', color: 'bg-blue-500' },
  { id: 'revisao-interna', title: 'Revisão Interna', color: 'bg-purple-500' },
  { id: 'mockup-pronto', title: 'Mockup Pronto', color: 'bg-cyan-500' },
  { id: 'enviado-aprovacao', title: 'Enviado p/ Aprovação', color: 'bg-amber-500' },
  { id: 'aprovado', title: 'Aprovado', color: 'bg-green-500' },
  { id: 'ajustes-solicitados', title: 'Ajustes Solicitados', color: 'bg-red-500' },
  { id: 'arte-finalizada', title: 'Arte Finalizada', color: 'bg-emerald-500' },
  { id: 'enviado-producao', title: 'Enviado p/ Produção', color: 'bg-indigo-500' },
  { id: 'sublimacao', title: 'Sublimação', color: 'bg-orange-500' },
  { id: 'finalizado', title: 'Finalizado', color: 'bg-teal-500' },
  { id: 'entregue', title: 'Entregue', color: 'bg-gray-500' },
]

export function KanbanBoard() {
  const { orders, designers, moveOrder } = useAppStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [search, setSearch] = useState('')
  const [filterDesigner, setFilterDesigner] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.clientName.toLowerCase().includes(search.toLowerCase()) ||
                           order.teamName.toLowerCase().includes(search.toLowerCase())
      const matchesDesigner = filterDesigner === 'all' || order.designerId === filterDesigner
      const matchesPriority = filterPriority === 'all' || order.priority === filterPriority
      return matchesSearch && matchesDesigner && matchesPriority
    })
  }, [orders, search, filterDesigner, filterPriority])

  const getOrdersByStatus = (status: OrderStatus) => {
    return filteredOrders.filter(order => order.status === status)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const orderId = active.id as string
      const newStatus = over.id as OrderStatus
      
      // Check if over.id is a valid status
      if (COLUMNS.some(col => col.id === newStatus)) {
        moveOrder(orderId, newStatus)
      }
    }

    setActiveId(null)
  }

  const activeOrder = activeId ? orders.find(o => o.id === activeId) : null

  const clearFilters = () => {
    setSearch('')
    setFilterDesigner('all')
    setFilterPriority('all')
  }

  const hasActiveFilters = search || filterDesigner !== 'all' || filterPriority !== 'all'

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou projeto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-xl border">
          <Select value={filterDesigner} onValueChange={setFilterDesigner}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Designer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Designers</SelectItem>
              {designers.map(designer => (
                <SelectItem key={designer.id} value={designer.id}>
                  {designer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Prioridades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map((column) => {
              const columnOrders = getOrdersByStatus(column.id)
              return (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  count={columnOrders.length}
                >
                  <SortableContext
                    items={columnOrders.map(o => o.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnOrders.map((order) => (
                      <KanbanCard
                        key={order.id}
                        order={order}
                        onClick={() => setSelectedOrder(order)}
                      />
                    ))}
                  </SortableContext>
                </KanbanColumn>
              )
            })}
          </div>

          <DragOverlay>
            {activeOrder ? (
              <KanbanCard order={activeOrder} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Order Modal */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}
