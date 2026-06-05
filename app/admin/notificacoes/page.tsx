"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, Trash2, Plus } from "lucide-react"

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

export default function NotificacoesPage() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "system"
  })

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (data) setNotifications(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    await supabase.from("notifications").insert({
      title: formData.title,
      message: formData.message,
      type: formData.type,
      read: false
    })
    
    setDialogOpen(false)
    setFormData({ title: "", message: "", type: "system" })
    loadNotifications()
  }

  async function handleMarkAsRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    loadNotifications()
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta notificação?")) return
    await supabase.from("notifications").delete().eq("id", id)
    loadNotifications()
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case "order":
        return <Badge variant="default">Pedido</Badge>
      case "approval":
        return <Badge className="bg-green-500">Aprovação</Badge>
      case "system":
        return <Badge variant="secondary">Sistema</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">Sistema</SelectItem>
            <SelectItem value="order">Pedido</SelectItem>
            <SelectItem value="approval">Aprovação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensagem *</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          required
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit">
          Criar
        </Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">Gerencie as notificações do sistema</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild className="hidden md:flex">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Notificação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Notificação</DialogTitle>
              </DialogHeader>
              {FormContent}
            </DialogContent>
          </Dialog>

          <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Notificação
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Nova Notificação</SheetTitle>
              </SheetHeader>
              {FormContent}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Lida</TableHead>
              <TableHead>Enviada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell className="font-medium">{notification.title}</TableCell>
                <TableCell>{notification.message}</TableCell>
                <TableCell>{getTypeBadge(notification.type)}</TableCell>
                <TableCell>
                  {notification.read ? (
                    <Badge variant="outline">Sim</Badge>
                  ) : (
                    <Badge className="bg-blue-500">Não</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(notification.created_at).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!notification.read && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(notification.id)}>
                        <Check className="w-4 h-4 mr-1" />
                        Marcar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(notification.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma notificação encontrada
        </div>
      )}
    </div>
  )
}
