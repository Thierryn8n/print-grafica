"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Save, DollarSign, Shirt, Layers, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Fabric {
  id: string
  name: string
  base_price_complete: number
  base_price_shirt_only: number
  is_active: boolean
  sort_order: number
}

interface ShirtType {
  id: string
  name: string
  category: string
  additional_price: number
  is_active: boolean
  sort_order: number
}

interface ShortType {
  id: string
  name: string
  category: string
  additional_price: number
  is_active: boolean
  sort_order: number
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export default function ValoresPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [shirtTypes, setShirtTypes] = useState<ShirtType[]>([])
  const [shortTypes, setShortTypes] = useState<ShortType[]>([])

  // edited prices: keyed by `${table}:${id}:${field}`
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [f, sh, st] = await Promise.all([
      supabase.from("fabrics").select("*").order("sort_order"),
      supabase.from("shirt_types").select("*").order("sort_order"),
      supabase.from("short_types").select("*").order("sort_order"),
    ])
    if (f.data) setFabrics(f.data)
    if (sh.data) setShirtTypes(sh.data)
    if (st.data) setShortTypes(st.data)
    setLoading(false)
  }

  function editKey(table: string, id: string, field: string) {
    return `${table}:${id}:${field}`
  }

  function getValue(table: string, id: string, field: string, current: number) {
    const key = editKey(table, id, field)
    return edits[key] !== undefined ? edits[key] : current.toString()
  }

  function setValue(table: string, id: string, field: string, value: string) {
    const sanitized = value.replace(/[^0-9.,]/g, "").replace(",", ".")
    setEdits((prev) => ({ ...prev, [editKey(table, id, field)]: sanitized }))
    setSavedKey(null)
  }

  async function saveRow(
    table: "fabrics" | "shirt_types" | "short_types",
    id: string,
    fields: string[],
  ) {
    const rowKey = `${table}:${id}`
    setSavingKey(rowKey)

    const payload: Record<string, number> = {}
    for (const field of fields) {
      const key = editKey(table, id, field)
      if (edits[key] !== undefined) {
        const parsed = parseFloat(edits[key])
        payload[field] = isNaN(parsed) ? 0 : parsed
      }
    }

    if (Object.keys(payload).length === 0) {
      setSavingKey(null)
      return
    }

    const { error } = await supabase.from(table).update(payload).eq("id", id)

    if (!error) {
      // update local state and clear edits
      if (table === "fabrics") {
        setFabrics((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)))
      } else if (table === "shirt_types") {
        setShirtTypes((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)))
      } else {
        setShortTypes((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)))
      }
      setEdits((prev) => {
        const next = { ...prev }
        for (const field of fields) delete next[editKey(table, id, field)]
        return next
      })
      setSavedKey(rowKey)
      setTimeout(() => setSavedKey((k) => (k === rowKey ? null : k)), 2000)
    } else {
      console.log("[v0] erro ao salvar valores:", error.message)
    }
    setSavingKey(null)
  }

  function rowHasEdits(table: string, id: string, fields: string[]) {
    return fields.some((field) => edits[editKey(table, id, field)] !== undefined)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalProducts = fabrics.length + shirtTypes.length + shortTypes.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="w-7 h-7 text-primary" />
          Tabela de Valores
        </h1>
        <p className="text-muted-foreground">
          Defina os preços de cada tecido e os valores adicionais por tipo de produto.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={Layers} label="Tecidos" value={fabrics.length} />
        <SummaryCard icon={Shirt} label="Tipos de Camisa" value={shirtTypes.length} />
        <SummaryCard icon={Shirt} label="Tipos de Short" value={shortTypes.length} />
      </div>

      <Tabs defaultValue="fabrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="fabrics">Tecidos</TabsTrigger>
          <TabsTrigger value="shirts">Camisas</TabsTrigger>
          <TabsTrigger value="shorts">Shorts</TabsTrigger>
        </TabsList>

        {/* TECIDOS */}
        <TabsContent value="fabrics">
          <Card>
            <CardHeader>
              <CardTitle>Preços dos Tecidos</CardTitle>
              <CardDescription>
                Preço base do conjunto completo e da camisa avulsa para cada tecido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tecido</TableHead>
                      <TableHead className="w-44">Preço Completo</TableHead>
                      <TableHead className="w-44">Preço Só Camisa</TableHead>
                      <TableHead className="w-28 text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fabrics.map((fabric) => {
                      const fields = ["base_price_complete", "base_price_shirt_only"]
                      const rowKey = `fabrics:${fabric.id}`
                      const dirty = rowHasEdits("fabrics", fabric.id, fields)
                      return (
                        <TableRow key={fabric.id} className={cn(!fabric.is_active && "opacity-50")}>
                          <TableCell className="font-medium">
                            {fabric.name}
                            {!fabric.is_active && (
                              <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <PriceInput
                              value={getValue("fabrics", fabric.id, "base_price_complete", fabric.base_price_complete)}
                              onChange={(v) => setValue("fabrics", fabric.id, "base_price_complete", v)}
                            />
                          </TableCell>
                          <TableCell>
                            <PriceInput
                              value={getValue("fabrics", fabric.id, "base_price_shirt_only", fabric.base_price_shirt_only)}
                              onChange={(v) => setValue("fabrics", fabric.id, "base_price_shirt_only", v)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <SaveButton
                              dirty={dirty}
                              saving={savingKey === rowKey}
                              saved={savedKey === rowKey}
                              onClick={() => saveRow("fabrics", fabric.id, fields)}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {fabrics.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum tecido cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAMISAS */}
        <TabsContent value="shirts">
          <Card>
            <CardHeader>
              <CardTitle>Valor por Tipo de Camisa</CardTitle>
              <CardDescription>
                Valor adicional cobrado conforme o modelo de camisa escolhido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductPriceTable
                items={shirtTypes}
                table="shirt_types"
                getValue={getValue}
                setValue={setValue}
                savingKey={savingKey}
                savedKey={savedKey}
                saveRow={saveRow}
                rowHasEdits={rowHasEdits}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SHORTS */}
        <TabsContent value="shorts">
          <Card>
            <CardHeader>
              <CardTitle>Valor por Tipo de Short</CardTitle>
              <CardDescription>
                Valor adicional cobrado conforme o modelo de short escolhido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductPriceTable
                items={shortTypes}
                table="short_types"
                getValue={getValue}
                setValue={setValue}
                savingKey={savingKey}
                savedKey={savedKey}
                saveRow={saveRow}
                rowHasEdits={rowHasEdits}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        {totalProducts} itens no catálogo. As alterações são salvas individualmente por linha.
      </p>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function PriceInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        inputMode="decimal"
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function SaveButton({
  dirty,
  saving,
  saved,
  onClick,
}: {
  dirty: boolean
  saving: boolean
  saved: boolean
  onClick: () => void
}) {
  if (saved) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
        <Check className="w-4 h-4" />
        Salvo
      </span>
    )
  }
  return (
    <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty || saving} onClick={onClick}>
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      <span className="ml-1">Salvar</span>
    </Button>
  )
}

interface ProductItem {
  id: string
  name: string
  category: string
  additional_price: number
  is_active: boolean
}

function ProductPriceTable({
  items,
  table,
  getValue,
  setValue,
  savingKey,
  savedKey,
  saveRow,
  rowHasEdits,
}: {
  items: ProductItem[]
  table: "shirt_types" | "short_types"
  getValue: (table: string, id: string, field: string, current: number) => string
  setValue: (table: string, id: string, field: string, value: string) => void
  savingKey: string | null
  savedKey: string | null
  saveRow: (table: "fabrics" | "shirt_types" | "short_types", id: string, fields: string[]) => void
  rowHasEdits: (table: string, id: string, fields: string[]) => boolean
}) {
  const categoryLabels: Record<string, string> = {
    basic: "Básico",
    sports: "Esportivo",
    fashion: "Fashion",
    custom: "Customizado",
    premium: "Premium",
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Modelo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="w-48">Valor Adicional</TableHead>
            <TableHead className="w-28 text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const fields = ["additional_price"]
            const rowKey = `${table}:${item.id}`
            const dirty = rowHasEdits(table, item.id, fields)
            return (
              <TableRow key={item.id} className={cn(!item.is_active && "opacity-50")}>
                <TableCell className="font-medium">
                  {item.name}
                  {!item.is_active && (
                    <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>
                  )}
                </TableCell>
                <TableCell>{categoryLabels[item.category] || item.category}</TableCell>
                <TableCell>
                  <PriceInput
                    value={getValue(table, item.id, "additional_price", item.additional_price)}
                    onChange={(v) => setValue(table, item.id, "additional_price", v)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <SaveButton
                    dirty={dirty}
                    saving={savingKey === rowKey}
                    saved={savedKey === rowKey}
                    onClick={() => saveRow(table, item.id, fields)}
                  />
                </TableCell>
              </TableRow>
            )
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                Nenhum item cadastrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
