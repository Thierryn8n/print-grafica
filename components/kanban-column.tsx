'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  count: number
  children: React.ReactNode
}

export function KanbanColumn({ id, title, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-2xl transition-all duration-200",
        isOver && "ring-2 ring-primary ring-offset-2 bg-primary/5"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full", color)} />
          <h3 className="font-semibold text-sm flex-1 truncate">{title}</h3>
          <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium">
            {count}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 min-h-[200px] overflow-y-auto max-h-[calc(100vh-280px)]">
        {children}
      </div>
    </div>
  )
}
