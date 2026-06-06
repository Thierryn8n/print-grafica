import * as XLSX from "xlsx"
import { IMPORT_FIELDS, type ImportFieldKey, type ImportError } from "@/lib/types"

export interface ParsedSheet {
  headers: string[]
  rows: Record<string, string>[]
}

/** Lê um arquivo .xlsx/.xls/.csv e retorna headers + linhas como objetos. */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: "",
    raw: false,
  })
  if (json.length === 0) return { headers: [], rows: [] }
  const headers = Object.keys(json[0])
  const rows = json.map((r) => {
    const out: Record<string, string> = {}
    for (const h of headers) out[h] = String(r[h] ?? "").trim()
    return out
  })
  return { headers, rows }
}

/** Faz o parse de texto colado (TSV do Excel ou CSV). Primeira linha = cabeçalho. */
export function parsePastedText(text: string): ParsedSheet {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim() !== "")
  if (lines.length === 0) return { headers: [], rows: [] }
  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ","
  const split = (line: string) => line.split(delimiter).map((c) => c.trim())
  const headers = split(lines[0])
  const rows = lines.slice(1).map((line) => {
    const cells = split(line)
    const out: Record<string, string> = {}
    headers.forEach((h, i) => {
      out[h] = cells[i] ?? ""
    })
    return out
  })
  return { headers, rows }
}

/** Normaliza string para comparação (sem acento, minúsculo, sem espaços). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

/**
 * Mapeamento inteligente: tenta associar cada header da planilha
 * a um campo conhecido com base nos aliases.
 * Retorna { header -> fieldKey }.
 */
export function autoMapColumns(headers: string[]): Record<string, ImportFieldKey | ""> {
  const mapping: Record<string, ImportFieldKey | ""> = {}
  for (const header of headers) {
    const norm = normalize(header)
    let matched: ImportFieldKey | "" = ""
    for (const field of IMPORT_FIELDS) {
      const candidates = [field.key, field.label, ...field.aliases].map(normalize)
      if (candidates.includes(norm)) {
        matched = field.key
        break
      }
    }
    mapping[header] = matched
  }
  return mapping
}

export interface MappedRow {
  data: Record<string, string | number>
  errors: ImportError[]
}

/**
 * Aplica o mapeamento de colunas às linhas e valida.
 * Cada linha precisa de pelo menos um campo preenchido; quantidade deve ser número.
 */
export function applyMappingAndValidate(
  sheet: ParsedSheet,
  mapping: Record<string, ImportFieldKey | "">,
): MappedRow[] {
  return sheet.rows.map((row, idx) => {
    const data: Record<string, string | number> = {}
    const errors: ImportError[] = []
    const rowNumber = idx + 2 // +1 cabeçalho, +1 base-1

    for (const [header, field] of Object.entries(mapping)) {
      if (!field) continue
      const raw = (row[header] ?? "").toString().trim()
      if (field === "quantity") {
        if (raw === "") {
          data.quantity = 1
        } else {
          const n = Number.parseInt(raw, 10)
          if (Number.isNaN(n) || n < 1) {
            errors.push({ row: rowNumber, field: "quantity", message: `Quantidade inválida: "${raw}"` })
            data.quantity = 1
          } else {
            data.quantity = n
          }
        }
      } else if (raw !== "") {
        data[field] = raw
      }
    }

    const hasContent = Object.keys(data).some((k) => k !== "quantity")
    if (!hasContent) {
      errors.push({ row: rowNumber, message: "Linha vazia (nenhum campo mapeado preenchido)" })
    }

    return { data, errors }
  })
}
