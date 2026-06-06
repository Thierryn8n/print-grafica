"use client"

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib"

export interface PdfArtItem {
  title: string
  // linhas de texto a desenhar (ex.: Nome, Número, Tamanho)
  lines: { label: string; value: string }[]
  // imagem opcional (data URL ou URL acessível)
  imageUrl?: string | null
}

export interface PdfMassOptions {
  documentTitle: string
  pageSize: "A4" | "A3"
  columns: number
  rows: number
  cutMarks: boolean
  bleedMm: number
  marginMm: number
}

const PAGE_SIZES: Record<string, [number, number]> = {
  // pontos (1 mm = 2.83465 pt)
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
}

const MM_TO_PT = 2.83465

function drawCutMarks(page: PDFPage, x: number, y: number, w: number, h: number, len = 12) {
  const color = rgb(0, 0, 0)
  const thickness = 0.5
  // cantos: superior-esquerdo, superior-direito, inferior-esquerdo, inferior-direito
  const corners = [
    { cx: x, cy: y + h }, // top-left
    { cx: x + w, cy: y + h }, // top-right
    { cx: x, cy: y }, // bottom-left
    { cx: x + w, cy: y }, // bottom-right
  ]
  for (const { cx, cy } of corners) {
    // marca horizontal
    page.drawLine({ start: { x: cx - len, y: cy }, end: { x: cx + len, y: cy }, thickness, color })
    // marca vertical
    page.drawLine({ start: { x: cx, y: cy - len }, end: { x: cx, y: cy + len }, thickness, color })
  }
}

async function embedImage(doc: PDFDocument, url: string) {
  try {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    // detecta PNG vs JPG pelos magic bytes
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      return await doc.embedPng(bytes)
    }
    return await doc.embedJpg(bytes)
  } catch {
    return null
  }
}

export async function generateMassPdf(items: PdfArtItem[], options: PdfMassOptions): Promise<Blob> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const [pageW, pageH] = PAGE_SIZES[options.pageSize] ?? PAGE_SIZES.A4
  const margin = options.marginMm * MM_TO_PT
  const cols = Math.max(1, options.columns)
  const rows = Math.max(1, options.rows)
  const perPage = cols * rows

  const gridW = pageW - margin * 2
  const gridH = pageH - margin * 2
  const cellW = gridW / cols
  const cellH = gridH / rows
  const pad = 8

  let page: PDFPage | null = null
  let slot = perPage // força criação na primeira iteração

  for (let i = 0; i < items.length; i++) {
    if (slot >= perPage) {
      page = doc.addPage([pageW, pageH])
      slot = 0
      // título do documento no topo
      page.drawText(options.documentTitle, {
        x: margin,
        y: pageH - margin + 6,
        size: 9,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      })
    }
    if (!page) continue

    const colIndex = slot % cols
    const rowIndex = Math.floor(slot / cols)
    const cellX = margin + colIndex * cellW
    // y do canto inferior da célula (pdf-lib origem inferior-esquerda)
    const cellY = pageH - margin - (rowIndex + 1) * cellH

    const item = items[i]

    // imagem (se houver) ocupa a metade superior
    if (item.imageUrl) {
      const img = await embedImage(doc, item.imageUrl)
      if (img) {
        const maxImgW = cellW - pad * 2
        const maxImgH = cellH * 0.55
        const scale = Math.min(maxImgW / img.width, maxImgH / img.height)
        const drawW = img.width * scale
        const drawH = img.height * scale
        page.drawImage(img, {
          x: cellX + (cellW - drawW) / 2,
          y: cellY + cellH - drawH - pad - 16,
          width: drawW,
          height: drawH,
        })
      }
    }

    // título do item
    page.drawText(truncate(item.title, font, 12, cellW - pad * 2), {
      x: cellX + pad,
      y: cellY + cellH - pad - 12,
      size: 12,
      font: fontBold,
      color: rgb(0, 0, 0),
    })

    // linhas de dados na metade inferior
    let textY = cellY + cellH * 0.4
    for (const ln of item.lines) {
      const text = `${ln.label}: ${ln.value}`
      page.drawText(truncate(text, font, 9, cellW - pad * 2), {
        x: cellX + pad,
        y: textY,
        size: 9,
        font,
        color: rgb(0.15, 0.15, 0.15),
      })
      textY -= 13
    }

    if (options.cutMarks) {
      drawCutMarks(page, cellX, cellY, cellW, cellH)
    }

    slot++
  }

  const bytes = await doc.save()
  return new Blob([bytes], { type: "application/pdf" })
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let result = text
  while (result.length > 1 && font.widthOfTextAtSize(result + "…", size) > maxWidth) {
    result = result.slice(0, -1)
  }
  return result + "…"
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
