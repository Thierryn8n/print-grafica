"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, ClipboardPaste, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react"
import { IMPORT_FIELDS, type ImportFieldKey, type ImportError, type ImportSourceType } from "@/lib/types"
import {
  parseSpreadsheetFile,
  parsePastedText,
  autoMapColumns,
  applyMappingAndValidate,
  type ParsedSheet,
} from "@/lib/import/import-engine"
import { commitImport } from "@/lib/orders/order-items-service"
import { toast } from "@/components/ui/use-toast"

type Step = "input" | "map" | "preview"

interface ImportDialogProps {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

export function ImportDialog({ orderId, open, onOpenChange, onImported }: ImportDialogProps) {
  const [step, setStep] = useState<Step>("input")
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<Record<string, ImportFieldKey | "">>({})
  const [sourceType, setSourceType] = useState<ImportSourceType>("excel")
  const [fileName, setFileName] = useState<string>("")
  const [pasteText, setPasteText] = useState("")
  const [loading, setLoading] = useState(false)

  const reset = useCallback(() => {
    setStep("input")
    setSheet(null)
    setMapping({})
    setPasteText("")
    setFileName("")
  }, [])

  function handleClose(o: boolean) {
    if (!o) reset()
    onOpenChange(o)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = await parseSpreadsheetFile(file)
      if (parsed.rows.length === 0) {
        toast({ title: "Arquivo vazio", description: "Nenhuma linha encontrada.", variant: "destructive" })
        return
      }
      setFileName(file.name)
      setSourceType(file.name.toLowerCase().endsWith(".csv") ? "csv" : "excel")
      setSheet(parsed)
      setMapping(autoMapColumns(parsed.headers))
      setStep("map")
    } catch {
      toast({ title: "Erro ao ler arquivo", description: "Verifique o formato (.xlsx, .xls ou .csv).", variant: "destructive" })
    }
  }

  function handlePaste() {
    const parsed = parsePastedText(pasteText)
    if (parsed.rows.length === 0) {
      toast({ title: "Nada para importar", description: "Cole dados com cabeçalho na primeira linha.", variant: "destructive" })
      return
    }
    setSourceType("paste")
    setFileName("")
    setSheet(parsed)
    setMapping(autoMapColumns(parsed.headers))
    setStep("map")
  }

  const validated = sheet ? applyMappingAndValidate(sheet, mapping) : []
  const allErrors: ImportError[] = validated.flatMap((v) => v.errors)
  const validRows = validated.filter((v) => v.errors.length === 0).map((v) => v.data)
  const mappedFieldsCount = Object.values(mapping).filter(Boolean).length

  async function handleConfirm() {
    if (!sheet) return
    setLoading(true)
    try {
      await commitImport({
        orderId,
        rows: validRows,
        errors: allErrors,
        sourceType,
        fileName: fileName || undefined,
        columnMapping: mapping as Record<string, string>,
        totalRows: sheet.rows.length,
      })
      toast({ title: "Importação concluída", description: `${validRows.length} item(ns) importado(s).` })
      onImported()
      handleClose(false)
    } catch (err) {
      toast({
        title: "Erro na importação",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importação em massa</DialogTitle>
          <DialogDescription>
            Importe jogadores/itens via Excel, CSV ou colando dados da planilha.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Arquivo
              </TabsTrigger>
              <TabsTrigger value="paste">
                <ClipboardPaste className="mr-2 h-4 w-4" /> Colar texto
              </TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="pt-4">
              <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-10 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Clique para enviar uma planilha</p>
                  <p className="text-sm text-muted-foreground">Formatos: .xlsx, .xls, .csv</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            </TabsContent>
            <TabsContent value="paste" className="pt-4 space-y-3">
              <Textarea
                placeholder={"Nome\tNúmero\tTamanho\nJoão\t10\tM\nMaria\t7\tG"}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Cole direto do Excel (separado por tabulação) ou CSV. A primeira linha deve conter os cabeçalhos.
              </p>
              <Button onClick={handlePaste} disabled={!pasteText.trim()} className="w-full">
                Processar dados <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {step === "map" && sheet && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {sheet.rows.length} linha(s) detectada(s). Associe cada coluna da planilha a um campo do sistema.
            </p>
            <div className="space-y-2">
              {sheet.headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm font-medium">
                    {header}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={mapping[header] || "ignore"}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [header]: v === "ignore" ? "" : (v as ImportFieldKey) }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ignore">Ignorar coluna</SelectItem>
                      {IMPORT_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {mappedFieldsCount === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Mapeie pelo menos uma coluna para continuar.</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === "preview" && sheet && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> {validRows.length} válida(s)
              </Badge>
              {allErrors.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {allErrors.length} com erro
                </Badge>
              )}
            </div>

            <div className="rounded-md border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.values(mapping)
                      .filter(Boolean)
                      .map((field) => (
                        <TableHead key={field}>
                          {IMPORT_FIELDS.find((f) => f.key === field)?.label}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validated.slice(0, 50).map((v, i) => (
                    <TableRow key={i} className={v.errors.length > 0 ? "bg-destructive/5" : ""}>
                      {Object.values(mapping)
                        .filter(Boolean)
                        .map((field) => (
                          <TableCell key={field as string} className="text-sm">
                            {String(v.data[field as string] ?? "—")}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {allErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Relatório de erros:</p>
                  <ul className="text-xs space-y-0.5 max-h-24 overflow-auto">
                    {allErrors.slice(0, 20).map((e, i) => (
                      <li key={i}>
                        Linha {e.row}
                        {e.field ? ` (${e.field})` : ""}: {e.message}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-1">Linhas com erro serão ignoradas na importação.</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={() => setStep("preview")} disabled={mappedFieldsCount === 0}>
                Pré-visualizar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Ajustar mapeamento
              </Button>
              <Button onClick={handleConfirm} disabled={loading || validRows.length === 0}>
                {loading ? "Importando..." : `Importar ${validRows.length} item(ns)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
