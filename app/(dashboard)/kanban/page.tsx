'use client'

import { KanbanBoard } from '@/components/kanban-board'
import { Button } from '@/components/ui/button'
import { PlusCircle, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Kanban</h1>
          </div>
          <p className="text-muted-foreground">
            Arraste os cards para atualizar o status dos pedidos
          </p>
        </div>
        <Link href="/novo-pedido">
          <Button className="gap-2 glow-orange">
            <PlusCircle className="h-4 w-4" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {/* Kanban Board */}
      <KanbanBoard />
    </div>
  )
}
