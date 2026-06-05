"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Copy, Trash2, Share2, CheckCircle, Calendar } from "lucide-react"

interface PublicForm {
  id: string
  form_token: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  team_name: string | null
  event_type: string | null
  deadline: string | null
  status: string
  notes: string | null
  created_at: string
}

export default function FormulariosPage() {
  const supabase = createClient()
  const [forms, setForms] = useState<PublicForm[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    team_name: "",
    event_type: "",
    deadline: "",
    notes: ""
  })

  useEffect(() => {
    loadForms()
  }, [])

  async function loadForms() {
    const { data } = await supabase
      .from("public_forms")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (data) setForms(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Generate unique token
    const form_token = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15)

    const payload = {
      form_token,
      client_name: formData.client_name,
      client_email: formData.client_email || null,
      client_phone: formData.client_phone || null,
      team_name: formData.team_name || null,
      event_type: formData.event_type || null,
      deadline: formData.deadline || null,
      notes: formData.notes || null,
      status: 'pending'
    }

    await supabase.from("public_forms").insert(payload)
    
    setDialogOpen(false)
    resetForm()
    loadForms()
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este formulário?")) return
    
    await supabase.from("public_forms").delete().eq("id", id)
    loadForms()
  }

  function getFormLink(token: string) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/formulario/${token}`
    }
    return `/formulario/${token}`
  }

  function copyToClipboard(token: string) {
    const link = getFormLink(token)
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function resetForm() {
    setFormData({
      client_name: "",
      client_email: "",
      client_phone: "",
      team_name: "",
      event_type: "",
      deadline: "",
      notes: ""
    })
  }

  function sanitizeInput(value: string): string {
    return value.replace(/[<>]/g, '').trim()
  }

  function getStatusBadge(status: string) {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    }
    
    const labels = {
      pending: "Pendente",
      in_progress: "Em Progresso",
      completed: "Concluído",
      cancelled: "Cancelado"
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Formulários Públicos</h1>
          <p className="text-muted-foreground">Crie e gerencie formulários para clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Formulário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Formulário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Nome do Cliente *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: sanitizeInput(e.target.value) })}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: sanitizeInput(e.target.value) })}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_phone">Telefone</Label>
                  <Input
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: sanitizeInput(e.target.value) })}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team_name">Nome do Time/Equipe</Label>
                  <Input
                    id="team_name"
                    value={formData.team_name}
                    onChange={(e) => setFormData({ ...formData, team_name: sanitizeInput(e.target.value) })}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_type">Tipo de Evento</Label>
                  <Select value={formData.event_type} onValueChange={(value) => setFormData({ ...formData, event_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interclass">Interclasse</SelectItem>
                      <SelectItem value="football">Time de Futebol</SelectItem>
                      <SelectItem value="commemorative">Comemorativo</SelectItem>
                      <SelectItem value="corporate">Corporativo</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Prazo</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: sanitizeInput(e.target.value) })}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Formulário
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
          <Card key={form.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{form.client_name}</h3>
                    {form.team_name && (
                      <p className="text-sm text-muted-foreground">{form.team_name}</p>
                    )}
                  </div>
                  {getStatusBadge(form.status)}
                </div>

                <div className="space-y-2 text-sm">
                  {form.client_email && (
                    <p className="text-muted-foreground">{form.client_email}</p>
                  )}
                  {form.client_phone && (
                    <p className="text-muted-foreground">{form.client_phone}</p>
                  )}
                  {form.event_type && (
                    <p className="text-muted-foreground capitalize">{form.event_type}</p>
                  )}
                  {form.deadline && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(form.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyToClipboard(form.form_token)}
                    >
                      {copiedToken === form.form_token ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar Link
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(getFormLink(form.form_token), '_blank')}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => handleDelete(form.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {forms.length === 0 && (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum formulário criado ainda</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Formulário
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
