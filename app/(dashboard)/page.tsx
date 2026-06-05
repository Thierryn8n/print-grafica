'use client'

import { DashboardStats, DesignerRanking, RecentOrders } from '@/components/dashboard-stats'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { PlusCircle, Kanban } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function DashboardPage() {
  const { currentUser } = useAppStore()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center p-2">
            <Image 
              src="/images/logo.png" 
              alt="GN Sublimais" 
              width={48} 
              height={48}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              Olá, <span className="text-primary">{currentUser?.name || 'Usuário'}</span>!
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo ao PrintFlow Studio
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/kanban">
            <Button variant="outline" className="gap-2">
              <Kanban className="h-4 w-4" />
              Ver Kanban
            </Button>
          </Link>
          <Link href="/novo-pedido">
            <Button className="gap-2 glow-orange">
              <PlusCircle className="h-4 w-4" />
              Novo Pedido
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStats />

      {/* Grid with Ranking and Recent */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DesignerRanking />
        <RecentOrders />
      </div>
    </div>
  )
}
