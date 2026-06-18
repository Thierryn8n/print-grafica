"use client"

import jsPDF from "jspdf"
import type { Company } from "@/lib/company"

export type ReceiptOrder = {
  orderNumber: string
  clientName: string
  clientPhone?: string | null
  serviceType?: string | null
  fabricName?: string | null
  quantity?: number | null
  unitPrice?: number | null
  totalValue: number
  paidValue: number
  downPaymentPercent?: number | null
  createdAt?: string | null
}

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0)
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Gera e baixa um recibo em PDF do pedido. */
export async function generateReceiptPdf(company: Company | null, order: ReceiptOrder) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 48
  let y = margin

  // Logo
  if (company?.logo_url) {
    const img = await loadImage(company.logo_url)
    if (img) {
      const maxW = 120
      const ratio = img.height / img.width
      const w = Math.min(maxW, img.width)
      const h = w * ratio
      try {
        doc.addImage(img, "PNG", margin, y, w, h)
      } catch {
        // ignora se o formato não for suportado
      }
      y += h + 12
    }
  }

  // Cabeçalho da empresa
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(company?.name || "Recibo", margin, y)
  y += 18

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(90)
  const headerLines: string[] = []
  if (company?.legal_name) headerLines.push(company.legal_name)
  if (company?.cnpj) headerLines.push(`CNPJ: ${company.cnpj}`)
  const addr = [company?.address, company?.city, company?.state].filter(Boolean).join(", ")
  if (addr) headerLines.push(addr)
  const contact = [company?.phone, company?.email].filter(Boolean).join(" | ")
  if (contact) headerLines.push(contact)
  headerLines.forEach((line) => {
    doc.text(line, margin, y)
    y += 13
  })

  // Título
  y += 12
  doc.setDrawColor(220)
  doc.line(margin, y, pageWidth - margin, y)
  y += 24
  doc.setTextColor(20)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("RECIBO DE PEDIDO", margin, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(90)
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR")
  doc.text(`${order.orderNumber}  -  ${dateStr}`, pageWidth - margin, y, { align: "right" })
  y += 26

  // Cliente
  doc.setTextColor(20)
  doc.setFontSize(10)
  doc.text(`Cliente: ${order.clientName}`, margin, y)
  y += 15
  if (order.clientPhone) {
    doc.text(`Telefone: ${order.clientPhone}`, margin, y)
    y += 15
  }

  // Itens
  y += 12
  doc.setFillColor(245)
  doc.rect(margin, y - 12, pageWidth - margin * 2, 22, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("DESCRIÇÃO", margin + 8, y + 3)
  doc.text("QTD", pageWidth - margin - 160, y + 3, { align: "right" })
  doc.text("UNIT.", pageWidth - margin - 90, y + 3, { align: "right" })
  doc.text("TOTAL", pageWidth - margin - 8, y + 3, { align: "right" })
  y += 26

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const desc = [order.serviceType, order.fabricName].filter(Boolean).join(" - ") || "Serviço de sublimação"
  doc.text(desc, margin + 8, y)
  doc.text(String(order.quantity ?? "-"), pageWidth - margin - 160, y, { align: "right" })
  doc.text(order.unitPrice ? brl(order.unitPrice) : "-", pageWidth - margin - 90, y, { align: "right" })
  doc.text(brl(order.totalValue), pageWidth - margin - 8, y, { align: "right" })
  y += 24

  // Totais
  doc.setDrawColor(220)
  doc.line(pageWidth - margin - 220, y, pageWidth - margin, y)
  y += 18

  const remaining = order.totalValue - (order.paidValue || 0)
  const rows: [string, string, boolean][] = [
    ["Valor total", brl(order.totalValue), false],
    [
      `Entrada${order.downPaymentPercent ? ` (${order.downPaymentPercent}%)` : ""}`,
      brl(order.totalValue * ((order.downPaymentPercent ?? 0) / 100)),
      false,
    ],
    ["Valor pago", brl(order.paidValue || 0), false],
    ["Saldo a pagar", brl(remaining), true],
  ]
  rows.forEach(([label, value, strong]) => {
    doc.setFont("helvetica", strong ? "bold" : "normal")
    doc.setFontSize(strong ? 12 : 10)
    doc.setTextColor(strong ? 20 : 90)
    doc.text(label, pageWidth - margin - 220, y)
    doc.text(value, pageWidth - margin - 8, y, { align: "right" })
    y += strong ? 22 : 17
  })

  // Rodapé
  y += 20
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.text(
    "Este documento é um comprovante interno de pedido e não possui valor fiscal.",
    margin,
    doc.internal.pageSize.getHeight() - 40,
  )

  doc.save(`recibo-${order.orderNumber}.pdf`)
}
