"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Users, Plus, Loader2, Pencil, Trash2, KeyRound } from "lucide-react"
import { formatCPF, formatPhoneBR } from "@/lib/ponto/utils"

interface Colaborador {
  id: string
  full_name: string
  cpf: string | null
  phone: string | null
  status: string
  role: string
  created_at: string
}

const emptyForm = { id: "", fullName: "", cpf: "", phone: "", password: "" }

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadColaboradores()
  }, [])

  async function loadColaboradores() {
    setLoading(true)
    try {
      const res = await fetch("/api/colaboradores")
      const data = await res.json()
      if (res.ok) {
        setColaboradores(data.colaboradores || [])
      } else {
        console.log("[v0] erro ao listar colaboradores:", data.error)
      }
    } catch (err) {
      console.log("[v0] erro de rede:", err)
    }
    setLoading(false)
  }

  function openCreate() {
    setForm(emptyForm)
    setEditing(false)
    setError("")
    setDialogOpen(true)
  }

  function openEdit(c: Colaborador) {
    setForm({
      id: c.id,
      fullName: c.full_name || "",
      cpf: c.cpf || "",
      phone: c.phone || "",
      password: "",
    })
    setEditing(true)
    setError("")
    setDialogOpen(true)
  }

  async function handleSubmit() {
    setError("")
    if (!form.fullName.trim()) return setError("Informe o nome completo")
    if (!editing && !form.cpf.trim()) return setError("Informe o CPF")
    if (!editing && !form.password) return setError("Defina uma senha inicial")

    setSaving(true)
    try {
      const res = await fetch("/api/colaboradores", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao salvar")
        setSaving(false)
        return
      }
      setDialogOpen(false)
      await loadColaboradores()
    } catch (err) {
      console.log("[v0] erro ao salvar colaborador:", err)
      setError("Erro de conexão")
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/colaboradores?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setColaboradores((prev) => prev.filter((c) => c.id !== id))
      } else {
        const data = await res.json()
        console.log("[v0] erro ao excluir:", data.error)
      }
    } catch (err) {
      console.log("[v0] erro ao excluir:", err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Colaboradores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre os colaboradores que vão bater ponto pelo aplicativo. Eles entram com CPF e senha.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo colaborador
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{colaboradores.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold text-foreground">
              {colaboradores.filter((c) => c.status === "approved").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Lista de colaboradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : colaboradores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum colaborador cadastrado ainda.</p>
              <p className="text-sm">Clique em &quot;Novo colaborador&quot; para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradores.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="font-mono">{c.cpf ? formatCPF(c.cpf) : "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone ? formatPhoneBR(c.phone) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "approved" ? "default" : "secondary"}>
                        {c.status === "approved" ? "Ativo" : c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(c)}
                          aria-label={`Editar ${c.full_name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Excluir ${c.full_name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir colaborador</AlertDialogTitle>
                              <AlertDialogDescription>
                                {`Tem certeza que deseja excluir "${c.full_name}"? Todos os registros de ponto associados serão removidos. Esta ação não pode ser desfeita.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(c.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados. Deixe a senha em branco para mantê-la."
                : "O colaborador fará login com o CPF e a senha definida aqui."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Ex: Maria da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formatCPF(form.cpf)}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
                disabled={editing}
                inputMode="numeric"
              />
              {editing && (
                <p className="text-xs text-muted-foreground">O CPF não pode ser alterado.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formatPhoneBR(form.phone)}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5" />
                {editing ? "Nova senha (opcional)" : "Senha inicial"}
              </Label>
              <Input
                id="password"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
