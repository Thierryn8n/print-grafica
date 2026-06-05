'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  UserCircle,
  Search,
  Phone,
  Package,
  Calendar,
  Mail
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState, useMemo } from 'react'

export default function ClientesPage() {
  const { orders } = useAppStore()
  const [search, setSearch] = useState('')

  // Group orders by client
  const clients = useMemo(() => {
    const clientMap = new Map<string, typeof orders>()
    
    orders.forEach(order => {
      const existing = clientMap.get(order.clientName) || []
      clientMap.set(order.clientName, [...existing, order])
    })
    
    return Array.from(clientMap.entries()).map(([name, clientOrders]) => ({
      name,
      phone: clientOrders[0].phone,
      totalOrders: clientOrders.length,
      totalQuantity: clientOrders.reduce((acc, o) => acc + o.totalQuantity, 0),
      lastOrder: clientOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0],
      orders: clientOrders
    }))
  }, [orders])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Clientes</h1>
          </div>
          <p className="text-muted-foreground">
            {clients.length} clientes cadastrados
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.name} className="glass border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {client.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{client.name}</h3>
                  {client.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <Package className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-xl font-bold">{client.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">{client.totalQuantity}</p>
                  <p className="text-xs text-muted-foreground">Peças Total</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-1">Último pedido:</p>
                <p className="text-sm font-medium">{client.lastOrder.teamName}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(client.lastOrder.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              <Button variant="outline" className="w-full mt-4">
                Ver Histórico
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card className="glass border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum cliente encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
