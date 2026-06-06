import type { OrderItem } from "@/lib/types"

/**
 * Exportação para CorelDRAW (Print Merge / Impressão em Lote).
 * O CorelDRAW importa fontes de dados em CSV/TXT (mala direta) e também
 * aceita JSON/XML para integrações externas. Geramos os três formatos.
 */

export type CorelExportFormat = "csv" | "json" | "xml"

const FIELDS: { key: keyof OrderItem; label: string }[] = [
  { key: "player_name", label: "NOME" },
  { key: "player_number", label: "NUMERO" },
  { key: "size", label: "TAMANHO" },
  { key: "position", label: "POSICAO" },
  { key: "team_name", label: "EQUIPE" },
  { key: "sponsor", label: "PATROCINADOR" },
]

function escapeCsv(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function buildCorelCsv(items: OrderItem[]): string {
  // CorelDRAW Print Merge usa a primeira linha como cabeçalho de campos.
  const header = FIELDS.map((f) => f.label).join("\t")
  const rows = items.map((it) =>
    FIELDS.map((f) => escapeCsv(String(it[f.key] ?? ""))).join("\t"),
  )
  return [header, ...rows].join("\n")
}

export function buildCorelJson(items: OrderItem[]): string {
  const records = items.map((it) => {
    const rec: Record<string, string> = {}
    for (const f of FIELDS) rec[f.label] = String(it[f.key] ?? "")
    return rec
  })
  return JSON.stringify({ version: "1.0", source: "PrintFlow", count: records.length, records }, null, 2)
}

export function buildCorelXml(items: OrderItem[]): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', "<printmerge>"]
  for (const it of items) {
    lines.push("  <record>")
    for (const f of FIELDS) {
      lines.push(`    <${f.label.toLowerCase()}>${escapeXml(String(it[f.key] ?? ""))}</${f.label.toLowerCase()}>`)
    }
    lines.push("  </record>")
  }
  lines.push("</printmerge>")
  return lines.join("\n")
}

export function buildCorelExport(items: OrderItem[], format: CorelExportFormat): { content: string; mime: string; ext: string } {
  switch (format) {
    case "json":
      return { content: buildCorelJson(items), mime: "application/json", ext: "json" }
    case "xml":
      return { content: buildCorelXml(items), mime: "application/xml", ext: "xml" }
    case "csv":
    default:
      return { content: buildCorelCsv(items), mime: "text/csv", ext: "csv" }
  }
}

export function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
