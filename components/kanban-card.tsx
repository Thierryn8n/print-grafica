'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Order, getServiceLabel, getPriorityLabel, useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, User, Package, AlertCircle, CheckCircle2, GripVertical } from 'lucide-react'
import { format, parseISO, isAfter, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface KanbanCardProps {
  order: Order
  onClick?: () => void
  isDragging?: boolean
}

export function KanbanCard({ order, onClick, isDragging }: KanbanCardProps) {
  const { designers } = useAppStore()
  const designer = designers.find(d => d.id === order.designerId)
  const today = startOfToday()
  const deadline = parseISO(order.deadline)
  const isOverdue = isAfter(today, deadline) && !['finalizado', 'entregue'].includes(order.status)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: order.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColors = {
    baixa: 'priority-low',
    normal: 'priority-normal',
    alta: 'priority-high',
    urgente: 'priority-urgent'
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer transition-all duration-200 border-0 shadow-md hover:shadow-lg",
        "bg-card hover:bg-card/80",
        isDragging && "opacity-50 shadow-2xl rotate-2 scale-105",
        isSorting && "opacity-50",
        isOverdue && "ring-2 ring-red-500/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Drag Handle & Priority */}
        <div className="flex items-center justify-between mb-3">
          <div
            {...attributes}
            {...listeners}
            className="p-1 -ml-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <Badge className={cn("text-xs font-medium", priorityColors[order.priority])}>
            {getPriorityLabel(order.priority)}
          </Badge>
        </div>

        {/* Client Name */}
        <h4 className="font-semibold text-sm mb-1 line-clamp-1">{order.clientName}</h4>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{order.teamName}</p>

        {/* Service Type */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Package className="h-3.5 w-3.5" />
          <span>{getServiceLabel(order.serviceType)}</span>
          <span className="ml-auto font-medium">{order.totalQuantity} un.</span>
        </div>

        {/* Deadline */}
        <div className={cn(
          "flex items-center gap-2 text-xs mb-3 p-2 rounded-lg",
          isOverdue ? "bg-red-500/10 text-red-500" : "bg-muted"
        )}>
          {isOverdue ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <Calendar className="h-3.5 w-3.5" />
          )}
          <span className={isOverdue ? "font-medium" : ""}>
            {isOverdue ? "Atrasado! " : ""}
            {format(deadline, "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Designer & Approval Status */}
        <div className="flex items-center justify-between">
          {designer ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {designer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                {designer.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-xs">Não atribuído</span>
            </div>
          )}

          {order.status === 'aprovado' && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </div>

        {/* Checklist Progress */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ 
                  width: `${Object.values(order.checklist).filter(Boolean).length / Object.values(order.checklist).length * 100}%` 
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Object.values(order.checklist).filter(Boolean).length}/{Object.values(order.checklist).length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
