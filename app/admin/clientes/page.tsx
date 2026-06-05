"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Edit } from "lucide-react"

interface Client {
  id: string
  name: string
  email: string | null
  phone: string
  whatsapp: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export default function ClientesPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    notes: ""
  })

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (data) setClients(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const payload = {
      name: formData.name.replace(/[<>]/g, '').trim(),
      email: formData.email.replace(/[<>]/g, '').trim() || null,
      phone: formData.phone.replace(/[<>]/g, '').trim(),
      whatsapp: formData.whatsapp.replace(/[<>]/g, '').trim() || null,
      address: formData.address.replace(/[<>]/g, '').trim() || null,
      notes: formData.notes.replace(/[<>]/g, '').trim() || null
    }

    if (editingClient) {
      await supabase.from("clients").update(payload).eq("id", editingClient.id)
    } else {
      await supabase.from("clients").insert(payload)
    }
    
    setDialogOpen(false)
    resetForm()
    loadClients()
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return
    
    await supabase.from("clients").delete().eq("id", id)
    loadClients()
  }

  function handleEdit(client: Client) {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone,
      whatsapp: client.whatsapp || "",
      address: client.address || "",
      notes: client.notes || ""
    })
    setDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      address: "",
      notes: ""
    })
    setEditingClient(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone *</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          maxLength={20}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          value={formData.whatsapp}
          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
          maxLength={20}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit">
          {editingClient ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild className="hidden md:flex">
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              {FormContent}
            </DialogContent>
          </Dialog>

          <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</SheetTitle>
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
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.email || "-"}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.whatsapp || "-"}</TableCell>
                <TableCell>{client.address || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(client)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {clients.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum cliente cadastrado
        </div>
      )}
    </div>
  )
}
