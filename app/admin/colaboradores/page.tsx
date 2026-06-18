"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Users, Loader2, Trash2, Link2, Copy, Check, Share2, Plus, RefreshCw } from "lucide-react"
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

interface InviteCode {
  id: string
  code: string
  max_uses: number | null
  uses: number
  is_active: boolean
  created_at: string
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function ColaboradoresPage() {
  const supabase = createClient()
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState("")
  const [creating, setCreating] = useState(false)
  const [maxUses, setMaxUses] = useState<string>("ilimitado")
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const res = await fetch("/api/colaboradores")
      const data = await res.json()
      if (res.ok) setColaboradores(data.colaboradores || [])
    } catch (err) {
      console.log("[v0] erro ao listar colaboradores:", err)
    }

    const { data: codes } = await supabase
      .from("invite_codes")
      .select("id, code, max_uses, uses, is_active, created_at")
      .eq("role", "colaborador")
      .order("created_at", { ascending: false })
    setInvites((codes as InviteCode[]) || [])

    setLoading(false)
  }

  function inviteLink(code: string) {
    return `${origin}/ponto/convite/${code}`
  }

  async function createInvite() {
    setCreating(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const code = randomCode()
    const max = maxUses === "ilimitado" ? null : parseInt(maxUses, 10)

    const { error } = await supabase.from("invite_codes").insert({
      code,
      role: "colaborador",
      created_by: user?.id ?? null,
      max_uses: max,
      is_active: true,
    })
    if (error) {
      console.log("[v0] erro ao criar convite:", error.message)
    } else {
      await loadAll()
    }
    setCreating(false)
  }

  async function toggleInvite(id: string, isActive: boolean) {
    await supabase.from("invite_codes").update({ is_active: !isActive }).eq("id", id)
    setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: !isActive } : i)))
  }

  async function deleteInvite(id: string) {
    await supabase.from("invite_codes").delete().eq("id", id)
    setInvites((prev) => prev.filter((i) => i.id !== id))
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(code))
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      console.log("[v0] clipboard indisponível")
    }
  }

  async function shareLink(code: string) {
    const url = inviteLink(code)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Cadastro de Ponto - Print Gráfica",
          text: "Faça seu cadastro para bater o ponto:",
          url,
        })
      } catch {
        /* usuário cancelou */
      }
    } else {
      copyLink(code)
    }
  }

  async function handleDeleteColaborador(id: string) {
    try {
      const res = await fetch(`/api/colaboradores?id=${id}`, { method: "DELETE" })
      if (res.ok) setColaboradores((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.log("[v0] erro ao excluir:", err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Colaboradores
        </h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">
          Gere um link de convite e compartilhe no grupo da equipe. Quem abrir o link faz o próprio
          cadastro e já entra vinculado à gráfica como colaborador.
        </p>
      </div>

      {/* Geração de link de convite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="w-5 h-5 text-primary" />
            Links de convite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label htmlFor="maxUses">Limite de cadastros por este link</Label>
              <Select value={maxUses} onValueChange={setMaxUses}>
                <SelectTrigger id="maxUses" className="sm:max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ilimitado">Ilimitado (link do grupo)</SelectItem>
                  <SelectItem value="1">1 pessoa</SelectItem>
                  <SelectItem value="5">Até 5 pessoas</SelectItem>
                  <SelectItem value="10">Até 10 pessoas</SelectItem>
                  <SelectItem value="20">Até 20 pessoas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createInvite} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Gerar link
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum link gerado ainda. Crie um para compartilhar com a equipe.
            </p>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono font-semibold text-foreground">{inv.code}</code>
                      <Badge variant={inv.is_active ? "default" : "secondary"}>
                        {inv.is_active ? "Ativo" : "Desativado"}
                      </Badge>
                      <Badge variant="outline">
                        {inv.max_uses === null
                          ? `${inv.uses} cadastro(s)`
                          : `${inv.uses}/${inv.max_uses} usados`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{inviteLink(inv.code)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyLink(inv.code)}>
                      {copied === inv.code ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      Copiar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => shareLink(inv.code)}>
                      <Share2 className="w-4 h-4" />
                      Enviar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleInvite(inv.id, inv.is_active)}
                      aria-label="Ativar/desativar"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteInvite(inv.id)}
                      aria-label="Excluir link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de colaboradores cadastrados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-muted-foreground" />
            Colaboradores cadastrados ({colaboradores.length})
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
              <p className="text-sm">Compartilhe um link de convite para que eles se cadastrem.</p>
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
                              onClick={() => handleDeleteColaborador(c.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
