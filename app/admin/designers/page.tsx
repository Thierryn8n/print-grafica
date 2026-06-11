"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Copy,
  Check,
  Share2,
  LinkIcon,
  Loader2,
} from "lucide-react"

const DESIGNER_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Designer 1", description: "Arte" },
  2: { label: "Designer 2", description: "Exportação" },
  3: { label: "Designer 3", description: "Finalização" },
}

interface Designer {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: string
  status: string
  avatar_url: string | null
  designer_level: number | null
  created_at: string
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "GN"
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function DesignersPage() {
  const supabase = createClient()
  const [designers, setDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLevel, setInviteLevel] = useState("1")
  const [generating, setGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadDesigners()
  }, [])

  async function loadDesigners() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "designer")
      .order("created_at", { ascending: false })

    if (data) setDesigners(data as Designer[])
    setLoading(false)
  }

  function inviteLink(code: string) {
    if (typeof window === "undefined") return `/convite-designer/${code}`
    return `${window.location.origin}/convite-designer/${code}`
  }

  function openInvite() {
    setGeneratedLink(null)
    setInviteLevel("1")
    setCopied(false)
    setInviteOpen(true)
  }

  async function handleGenerateInvite() {
    setGenerating(true)
    const code = generateCode()
    const { data: userData } = await supabase.auth.getUser()

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
      designer_level: Number(inviteLevel),
    })

    if (error) {
      console.log("[v0] erro ao gerar convite:", error.message)
    } else {
      setGeneratedLink(inviteLink(code))
    }
    setGenerating(false)
  }

  async function handleCopyLink() {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.log("[v0] erro ao copiar link:", err)
    }
  }

  function shareWhatsApp() {
    if (!generatedLink) return
    const info = DESIGNER_LEVELS[Number(inviteLevel)]
    const fn = info ? ` como ${info.label} (${info.description})` : ""
    const msg = `Olá! Você foi convidado para entrar na nossa gráfica${fn}. Cadastre-se por este link: ${generatedLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
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
          <Badge variant="default" className="bg-emerald-500 text-white hover:bg-emerald-500">
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

  function levelBadge(level: number | null) {
    if (level && DESIGNER_LEVELS[level]) {
      return (
        <Badge variant="outline">
          {DESIGNER_LEVELS[level].label} · {DESIGNER_LEVELS[level].description}
        </Badge>
      )
    }
    return <span className="text-muted-foreground text-sm">—</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Designers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Convide designers por link e gerencie os cadastros da sua gráfica.
          </p>
        </div>
        <Button onClick={openInvite} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Convidar designer
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {designers.map((designer) => (
              <TableRow key={designer.id}>
                <TableCell className="font-medium">{designer.full_name || "—"}</TableCell>
                <TableCell>{designer.email}</TableCell>
                <TableCell>{levelBadge(designer.designer_level)}</TableCell>
                <TableCell>{getStatusBadge(designer.status)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(designer.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
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
        <div className="text-center py-12 text-muted-foreground">Nenhum designer cadastrado</div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar designer</DialogTitle>
            <DialogDescription>
              Escolha a classificação e gere um link de convite. Ao se cadastrar, o designer já entra
              vinculado à sua gráfica com a função definida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-level">Classificação</Label>
              <Select value={inviteLevel} onValueChange={setInviteLevel} disabled={!!generatedLink}>
                <SelectTrigger id="invite-level">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DESIGNER_LEVELS).map(([value, info]) => (
                    <SelectItem key={value} value={value}>
                      {info.label} — {info.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!generatedLink ? (
              <Button onClick={handleGenerateInvite} disabled={generating} className="w-full gap-2">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                Gerar link de convite
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Link de convite</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm">
                      {generatedLink}
                    </code>
                    <Button size="icon" variant="outline" onClick={handleCopyLink} aria-label="Copiar link">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={shareWhatsApp} className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                  <Share2 className="w-4 h-4" />
                  Compartilhar no WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setGeneratedLink(null)
                    setCopied(false)
                  }}
                >
                  Gerar outro convite
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
