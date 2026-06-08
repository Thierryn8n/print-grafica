"use client"

import { useEffect, useState } from "react"
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleFavorite,
  extractPlaceholders,
  TEMPLATE_CATEGORIES,
  type ArtTemplate,
  type TemplateCategory,
  type TemplateLayer,
} from "@/lib/templates/template-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ArtCanvas } from "@/components/templates/art-canvas"
import { LayerEditor } from "@/components/templates/layer-editor"
import { Plus, Star, Pencil, Trash2, Layers, Wand2 } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ArtTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TemplateCategory | "todos">("todos")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ArtTemplate | null>(null)

  // form state
  const [name, setName] = useState("")
  const [category, setCategory] = useState<TemplateCategory>("camisas")
  const [description, setDescription] = useState("")
  const [widthMm, setWidthMm] = useState(210)
  const [heightMm, setHeightMm] = useState(297)
  const [layers, setLayers] = useState<TemplateLayer[]>([])
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setTemplates(await listTemplates())
    } catch (e) {
      console.log("[v0] erro ao listar templates:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openNew() {
    setEditing(null)
    setName("")
    setCategory("camisas")
    setDescription("")
    setWidthMm(210)
    setHeightMm(297)
    setLayers([
      { id: crypto.randomUUID(), type: "text", name: "Nome", x: 15, y: 40, width: 70, height: 14, content: "{{nome}}", fontSize: 9, fontWeight: "bold", color: "#111111", align: "center" },
      { id: crypto.randomUUID(), type: "text", name: "Número", x: 30, y: 56, width: 40, height: 22, content: "{{numero}}", fontSize: 18, fontWeight: "bold", color: "#1d4ed8", align: "center" },
    ])
    setEditorOpen(true)
  }

  function openEdit(t: ArtTemplate) {
    setEditing(t)
    setName(t.name)
    setCategory(t.category)
    setDescription(t.description ?? "")
    setWidthMm(Number(t.width_mm))
    setHeightMm(Number(t.height_mm))
    setLayers(t.layers ?? [])
    setEditorOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: "Informe um nome para o template", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateTemplate(editing.id, { name, category, description, width_mm: widthMm, height_mm: heightMm, layers })
        toast({ title: "Template atualizado" })
      } else {
        await createTemplate({ name, category, description, width_mm: widthMm, height_mm: heightMm, layers })
        toast({ title: "Template criado" })
      }
      setEditorOpen(false)
      await load()
    } catch (e) {
      console.log("[v0] erro ao salvar template:", e)
      toast({ title: "Erro ao salvar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(t: ArtTemplate) {
    if (!confirm(`Excluir o template "${t.name}"?`)) return
    try {
      await deleteTemplate(t.id)
      await load()
    } catch (e) {
      console.log("[v0] erro ao excluir:", e)
    }
  }

  async function handleFavorite(t: ArtTemplate) {
    try {
      await toggleFavorite(t.id, !t.is_favorite)
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_favorite: !x.is_favorite } : x)))
    } catch (e) {
      console.log("[v0] erro ao favoritar:", e)
    }
  }

  const filtered = templates
    .filter((t) => filter === "todos" || t.category === filter)
    .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite))

  const currentPlaceholders = extractPlaceholders(layers)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Biblioteca de Templates</h1>
          <p className="text-sm text-muted-foreground">Crie modelos com campos variáveis para gerar artes em massa</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Novo Template
        </Button>
      </div>

      {/* Filtros por categoria */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("todos")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === "todos" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
        >
          Todos
        </button>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === c.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <Layers className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum template ainda. Crie o primeiro modelo com campos variáveis.</p>
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo Template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {filtered.map((t) => (
            <Card key={t.id} className="overflow-hidden group">
              <div className="relative bg-muted/40 p-2" style={{ containerType: "inline-size" }}>
                <ArtCanvas layers={t.layers ?? []} widthMm={Number(t.width_mm)} heightMm={Number(t.height_mm)} />
                <button
                  onClick={() => handleFavorite(t)}
                  className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-background/80 backdrop-blur"
                  aria-label="Favoritar"
                >
                  <Star className={`w-4 h-4 ${t.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                      {TEMPLATE_CATEGORIES.find((c) => c.key === t.category)?.label ?? t.category}
                    </Badge>
                  </div>
                </div>
                {t.placeholders?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.placeholders.slice(0, 3).map((p) => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{`{{${p}}}`}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <Button asChild size="sm" variant="default" className="flex-1 h-8">
                    <Link href={`/admin/templates/${t.id}/gerar`}>
                      <Wand2 className="w-3.5 h-3.5 mr-1" /> Gerar
                    </Link>
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleDelete(t)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" placeholder="Ex: Camisa de time padrão" />
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Largura (mm)</Label>
                <Input type="number" value={widthMm} onChange={(e) => setWidthMm(Number(e.target.value))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Altura (mm)</Label>
                <Input type="number" value={heightMm} onChange={(e) => setHeightMm(Number(e.target.value))} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Notas sobre o template" />
            </div>

            <LayerEditor layers={layers} widthMm={widthMm} heightMm={heightMm} onChange={setLayers} />

            {currentPlaceholders.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="text-muted-foreground">Campos detectados:</span>
                {currentPlaceholders.map((p) => (
                  <span key={p} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{`{{${p}}}`}</span>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
