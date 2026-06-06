"use client"

import { useState } from "react"
import type { TemplateLayer, LayerType } from "@/lib/templates/template-service"
import { ArtCanvas } from "./art-canvas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Type, ImageIcon, Square, Trash2, Plus } from "lucide-react"

interface LayerEditorProps {
  layers: TemplateLayer[]
  widthMm: number
  heightMm: number
  onChange: (layers: TemplateLayer[]) => void
}

const LAYER_DEFAULTS: Record<LayerType, Partial<TemplateLayer>> = {
  text: { content: "Texto {{nome}}", fontSize: 6, fontWeight: "bold", color: "#111111", align: "center" },
  image: { content: "" },
  rect: { color: "#1d4ed8" },
}

export function LayerEditor({ layers, widthMm, heightMm, onChange }: LayerEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(layers[0]?.id ?? null)
  const selected = layers.find((l) => l.id === selectedId) ?? null

  function addLayer(type: LayerType) {
    const id = crypto.randomUUID()
    const layer: TemplateLayer = {
      id,
      type,
      name: type === "text" ? "Texto" : type === "image" ? "Imagem" : "Forma",
      x: 25,
      y: 40,
      width: 50,
      height: type === "text" ? 12 : 25,
      content: "",
      ...LAYER_DEFAULTS[type],
    } as TemplateLayer
    onChange([...layers, layer])
    setSelectedId(id)
  }

  function updateSelected(patch: Partial<TemplateLayer>) {
    if (!selected) return
    onChange(layers.map((l) => (l.id === selected.id ? { ...l, ...patch } : l)))
  }

  function removeSelected() {
    if (!selected) return
    onChange(layers.filter((l) => l.id !== selected.id))
    setSelectedId(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => addLayer("text")}>
            <Type className="w-4 h-4 mr-1" /> Texto
          </Button>
          <Button size="sm" variant="outline" onClick={() => addLayer("image")}>
            <ImageIcon className="w-4 h-4 mr-1" /> Imagem
          </Button>
          <Button size="sm" variant="outline" onClick={() => addLayer("rect")}>
            <Square className="w-4 h-4 mr-1" /> Forma
          </Button>
        </div>
        <div className="max-w-md mx-auto w-full" style={{ containerType: "inline-size" }}>
          <ArtCanvas
            layers={layers}
            widthMm={widthMm}
            heightMm={heightMm}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Use chaves duplas para campos variáveis, ex: {"{{nome}}"}, {"{{numero}}"}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Camadas</Label>
          <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
            {layers.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma camada ainda.</p>}
            {layers.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-md flex items-center gap-2 ${
                  selectedId === l.id ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                {l.type === "text" ? <Type className="w-3 h-3" /> : l.type === "image" ? <ImageIcon className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                <span className="truncate">{l.content || l.name}</span>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Propriedades</Label>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={removeSelected}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>

            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} className="h-8" />
            </div>

            {selected.type === "text" && (
              <>
                <div>
                  <Label className="text-xs">Conteúdo</Label>
                  <Input
                    value={selected.content}
                    onChange={(e) => updateSelected({ content: e.target.value })}
                    className="h-8"
                    placeholder="Ex: {{nome}}"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tamanho fonte</Label>
                    <Input
                      type="number"
                      value={selected.fontSize ?? 6}
                      onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cor</Label>
                    <Input
                      type="color"
                      value={selected.color ?? "#111111"}
                      onChange={(e) => updateSelected({ color: e.target.value })}
                      className="h-8 p-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Alinhamento</Label>
                    <Select value={selected.align ?? "center"} onValueChange={(v) => updateSelected({ align: v as TemplateLayer["align"] })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Peso</Label>
                    <Select value={selected.fontWeight ?? "bold"} onValueChange={(v) => updateSelected({ fontWeight: v as TemplateLayer["fontWeight"] })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Negrito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {selected.type === "image" && (
              <div>
                <Label className="text-xs">URL da imagem</Label>
                <Input value={selected.content} onChange={(e) => updateSelected({ content: e.target.value })} className="h-8" placeholder="https://..." />
              </div>
            )}

            {selected.type === "rect" && (
              <div>
                <Label className="text-xs">Cor</Label>
                <Input type="color" value={selected.color ?? "#1d4ed8"} onChange={(e) => updateSelected({ color: e.target.value })} className="h-8 p-1" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X (%)</Label>
                <Input type="number" value={selected.x} onChange={(e) => updateSelected({ x: Number(e.target.value) })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Y (%)</Label>
                <Input type="number" value={selected.y} onChange={(e) => updateSelected({ y: Number(e.target.value) })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Largura (%)</Label>
                <Input type="number" value={selected.width} onChange={(e) => updateSelected({ width: Number(e.target.value) })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Altura (%)</Label>
                <Input type="number" value={selected.height} onChange={(e) => updateSelected({ height: Number(e.target.value) })} className="h-8" />
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-border pt-3 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Plus className="w-5 h-5" />
            Selecione ou adicione uma camada
          </div>
        )}
      </div>
    </div>
  )
}
