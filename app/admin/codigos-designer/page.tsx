"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { KeyRound, Plus, Copy, Check, Ban, Loader2, Palette, LinkIcon, Share2 } from "lucide-react"

const DESIGNER_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Designer 1", description: "Arte" },
  2: { label: "Designer 2", description: "Exportação" },
  3: { label: "Designer 3", description: "Finalização" },
}

interface InviteCode {
  id: string
  code: string
  role: string
  used_by: string | null
  used_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
  designer_level: number | null
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "GN"
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function CodigosDesignerPage() {
  const supabase = createClient()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [newLevel, setNewLevel] = useState("1")

  function inviteLink(code: string) {
    if (typeof window === "undefined") return `/convite-designer/${code}`
    return `${window.location.origin}/convite-designer/${code}`
  }

  useEffect(() => {
    loadCodes()
  }, [])

  async function loadCodes() {
    const { data, error } = await supabase
      .from("invite_codes")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.log("[v0] erro ao carregar códigos:", error.message)
    }
    if (data) setCodes(data as InviteCode[])
    setLoading(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    const code = generateCode()
    const { data: userData } = await supabase.auth.getUser()

    // Vincula o convite à gráfica do admin logado, para o designer entrar na empresa certa
    let companyId: string | null = null
    if (userData.user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user.id)
        .maybeSingle()
      companyId = profile?.company_id ?? null
    }

    const { error } = await supabase.from("invite_codes").insert({
      code,
      role: "designer",
      created_by: userData.user?.id ?? null,
      company_id: companyId,
      designer_level: Number(newLevel),
    })

    if (error) {
      console.log("[v0] erro ao gerar código:", error.message)
    } else {
      await loadCodes()
    }
    setGenerating(false)
  }

  async function handleCopyLink(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(code))
      setCopiedLinkId(id)
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch (err) {
      console.log("[v0] erro ao copiar link:", err)
    }
  }

  function shareWhatsApp(code: string, level: number | null) {
    const fn = level && DESIGNER_LEVELS[level] ? ` como ${DESIGNER_LEVELS[level].label} (${DESIGNER_LEVELS[level].description})` : ""
    const msg = `Olá! Você foi convidado para entrar na nossa gráfica${fn}. Cadastre-se por este link: ${inviteLink(code)}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  async function handleDeactivate(id: string) {
    const { error } = await supabase
      .from("invite_codes")
      .update({ is_active: false })
      .eq("id", id)

    if (error) {
      console.log("[v0] erro ao desativar código:", error.message)
      return
    }
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: false } : c)))
  }

  async function handleCopy(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.log("[v0] erro ao copiar:", err)
    }
  }

  function getStatus(code: InviteCode): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (code.used_by) return { label: "Utilizado", variant: "secondary" }
    if (!code.is_active) return { label: "Desativado", variant: "destructive" }
    if (code.expires_at && new Date(code.expires_at) < new Date()) return { label: "Expirado", variant: "destructive" }
    return { label: "Ativo", variant: "default" }
  }

  const activeCount = codes.filter((c) => c.is_active && !c.used_by).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-primary" />
            Códigos de Convite
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha a classificação, gere o convite e envie o link ao designer. Ao se cadastrar pelo
            link, ele já entra vinculado à sua gráfica e com a função definida.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={newLevel} onValueChange={setNewLevel}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="Classificação" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DESIGNER_LEVELS).map(([value, info]) => (
                <SelectItem key={value} value={value}>
                  {info.label} — {info.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Gerar convite
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Códigos ativos</p>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Designers vinculados</p>
            <p className="text-2xl font-bold text-foreground">{codes.filter((c) => c.used_by).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total gerado</p>
            <p className="text-2xl font-bold text-foreground">{codes.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-muted-foreground" />
            Códigos gerados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum código gerado ainda.</p>
              <p className="text-sm">Clique em &quot;Gerar novo código&quot; para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const status = getStatus(code)
                  const canManage = code.is_active && !code.used_by
                  return (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-semibold tracking-widest">{code.code}</TableCell>
                      <TableCell>
                        {code.designer_level && DESIGNER_LEVELS[code.designer_level] ? (
                          <Badge variant="outline">
                            {DESIGNER_LEVELS[code.designer_level].label} · {DESIGNER_LEVELS[code.designer_level].description}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(code.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(code.code, code.id)}
                            aria-label={`Copiar link de convite ${code.code}`}
                            disabled={!canManage}
                            title="Copiar link do convite"
                          >
                            {copiedLinkId === code.id ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <LinkIcon className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => shareWhatsApp(code.code, code.designer_level)}
                            aria-label={`Compartilhar convite ${code.code} no WhatsApp`}
                            disabled={!canManage}
                            title="Enviar por WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopy(code.code, code.id)}
                            aria-label={`Copiar código ${code.code}`}
                            disabled={!canManage}
                            title="Copiar código"
                          >
                            {copiedId === code.id ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          {canManage && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive"
                                  aria-label={`Desativar código ${code.code}`}
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Desativar código</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {`Tem certeza que deseja desativar o código "${code.code}"? Ele não poderá mais ser usado para cadastro.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeactivate(code.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Desativar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
