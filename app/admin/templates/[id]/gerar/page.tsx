"use client"

import { useEffect, useState, use } from "react"
import {
  getTemplate,
  generateVersions,
  parseRecordsFromText,
  saveGeneration,
  type ArtTemplate,
  type GeneratedVersion,
} from "@/lib/templates/template-service"
import { ArtCanvas } from "@/components/templates/art-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wand2, Download, Save, ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

export default function GenerateArtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [template, setTemplate] = useState<ArtTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [rawText, setRawText] = useState("")
  const [versions, setVersions] = useState<GeneratedVersion[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTemplate(id)
      .then((t) => {
        setTemplate(t)
        if (t) {
          // gera um exemplo de cabeçalho a partir dos placeholders
          if (t.placeholders.length > 0) {
            setRawText(t.placeholders.join("\t"))
          }
        }
      })
      .catch((e) => console.log("[v0] erro ao carregar template:", e))
      .finally(() => setLoading(false))
  }, [id])

  function handleGenerate() {
    if (!template) return
    const records = parseRecordsFromText(rawText)
    if (records.length === 0) {
      toast({ title: "Cole ao menos um cabeçalho e uma linha de dados", variant: "destructive" })
      return
    }
    const labelKey = template.placeholders.find((p) => /nome|name|jogador|cliente/i.test(p)) ?? template.placeholders[0]
    const generated = generateVersions(template, records, labelKey)
    setVersions(generated)
    toast({ title: `${generated.length} versão(ões) gerada(s)` })
  }

  async function handleSave() {
    if (!template || versions.length === 0) return
    setSaving(true)
    try {
      await saveGeneration({ template_id: template.id, batch_label: `${versions.length} versões`, versions })
      toast({ title: "Geração salva no histórico" })
    } catch (e) {
      console.log("[v0] erro ao salvar geração:", e)
      toast({ title: "Erro ao salvar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  function handleExportCsv() {
    if (versions.length === 0) return
    const keys = Object.keys(versions[0].values)
    const header = ["versao", ...keys].join(",")
    const rows = versions.map((v, i) => [`Versão ${i + 1}`, ...keys.map((k) => `"${(v.values[k] ?? "").replace(/"/g, '""')}"`)].join(","))
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `artes-${template?.name ?? "template"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (!template)
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Template não encontrado.</p>
        <Button asChild variant="outline" size="sm"><Link href="/admin/templates"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link></Button>
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon" className="h-9 w-9">
          <Link href="/admin/templates"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Gerar Artes — {template.name}</h1>
          <p className="text-sm text-muted-foreground">Preencha os campos variáveis para gerar várias versões de uma vez</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados das versões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-muted-foreground">Campos:</span>
              {template.placeholders.map((p) => (
                <span key={p} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{`{{${p}}}`}</span>
              ))}
            </div>
            <Tabs defaultValue="colar">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="colar"><FileText className="w-4 h-4 mr-1" /> Colar dados</TabsTrigger>
                <TabsTrigger value="ajuda">Ajuda</TabsTrigger>
              </TabsList>
              <TabsContent value="colar" className="space-y-2 pt-2">
                <Label className="text-xs">Cole os dados (primeira linha = cabeçalho)</Label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                  placeholder={`${template.placeholders.join("\t")}\nJoão\t10\nMaria\t7`}
                />
              </TabsContent>
              <TabsContent value="ajuda" className="pt-2 text-xs text-muted-foreground space-y-2">
                <p>A primeira linha define os nomes dos campos (devem corresponder aos campos variáveis do template).</p>
                <p>Cada linha seguinte gera uma versão da arte. Separe colunas por tabulação, vírgula ou ponto e vírgula.</p>
              </TabsContent>
            </Tabs>
            <Button className="w-full" onClick={handleGenerate}>
              <Wand2 className="w-4 h-4 mr-1" /> Gerar versões
            </Button>
            {versions.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" className="flex-1" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleExportCsv}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          {versions.length === 0 ? (
            <Card>
              <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
                <Wand2 className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">As artes geradas aparecerão aqui. Preencha os dados e clique em &quot;Gerar versões&quot;.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">{versions.length} versão(ões) gerada(s)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {versions.map((v, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="bg-muted/40 p-2" style={{ containerType: "inline-size" }}>
                      <ArtCanvas layers={v.layers} widthMm={Number(template.width_mm)} heightMm={Number(template.height_mm)} showCropMarks />
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium truncate">{v.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
