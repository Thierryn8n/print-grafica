"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Plus } from "lucide-react"

interface Designer {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: string
  status: string
  avatar_url: string | null
  created_at: string
}

export default function DesignersPage() {
  const supabase = createClient()
  const [designers, setDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: ""
  })

  useEffect(() => {
    loadDesigners()
  }, [])

  async function loadDesigners() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "designer")
      .order("created_at", { ascending: false })
    
    if (data) setDesigners(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.signUp({
      email: formData.email,
      password: "temp123456",
      options: {
        data: {
          full_name: formData.full_name,
          phone: formData.phone,
          role: "designer"
        }
      }
    })
    
    if (user) {
      await supabase.from("profiles").insert({
        id: user.id,
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        role: "designer",
        status: "pending"
      })
    }
    
    setDialogOpen(false)
    setFormData({ email: "", full_name: "", phone: "" })
    loadDesigners()
  }

  async function handleApprove(id: string) {
    await supabase.from("profiles").update({ status: "approved" }).eq("id", id)
    loadDesigners()
  }

  async function handleReject(id: string) {
    if (!confirm("Tem certeza que deseja rejeitar este designer?")) return
    await supabase.from("profiles").update({ status: "rejected" }).eq("id", id)
    loadDesigners()
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">Nome Completo *</Label>
        <Input
          id="full_name"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          maxLength={20}
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
          <h1 className="text-3xl font-bold">Designers</h1>
          <p className="text-muted-foreground">Gerencie os designers do sistema</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild className="hidden md:flex">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Designer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Designer</DialogTitle>
              </DialogHeader>
              {FormContent}
            </DialogContent>
          </Dialog>

          <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Designer
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Novo Designer</SheetTitle>
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
              <TableHead>Status</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {designers.map((designer) => (
              <TableRow key={designer.id}>
                <TableCell className="font-medium">{designer.full_name}</TableCell>
                <TableCell>{designer.email}</TableCell>
                <TableCell>{designer.phone || "-"}</TableCell>
                <TableCell>{getStatusBadge(designer.status)}</TableCell>
                <TableCell>{new Date(designer.created_at).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {designer.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(designer.id)}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(designer.id)}>
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                    {designer.status === "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(designer.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {designers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum designer cadastrado
        </div>
      )}
    </div>
  )
}
