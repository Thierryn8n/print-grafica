// Detailed Reports Service for MÓDULO 24
// Relatórios por período, designer, cliente, produtividade, export PDF/Excel

import { createClient } from "@/lib/supabase/client"

export interface ReportData {
  period: string
  totalOrders: number
  totalRevenue: number
  completedOrders: number
  pendingOrders: number
  averageTime: number
}

export interface DesignerReport {
  designerId: string
  designerName: string
  totalOrders: number
  completedOrders: number
  averageTime: number
  revenue: number
}

export interface ClientReport {
  clientId: string
  clientName: string
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
}

export class DetailedReportsService {
  private supabase = createClient()

  // Relatório por período (diário, semanal, mensal)
  async getReportByPeriod(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<ReportData[]> {
    const { data: orders } = await this.supabase
      .from("orders")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true })

    if (!orders) return []

    // Agrupar por período
    const grouped = new Map<string, any[]>()

    orders.forEach((order) => {
      const date = new Date(order.created_at)
      let key: string

      if (period === 'daily') {
        key = date.toISOString().split('T')[0]
      } else if (period === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(order)
    })

    // Gerar relatório
    return Array.from(grouped.entries()).map(([period, periodOrders]) => ({
      period,
      totalOrders: periodOrders.length,
      totalRevenue: periodOrders.reduce((sum, o) => sum + (o.total_value || 0), 0),
      completedOrders: periodOrders.filter(o => o.status === 'finalizado').length,
      pendingOrders: periodOrders.filter(o => o.status !== 'finalizado').length,
      averageTime: 0, // Calcular baseado em activity_logs
    }))
  }

  // Relatório por designer
  async getReportByDesigner(startDate: Date, endDate: Date): Promise<DesignerReport[]> {
    const { data: orders } = await this.supabase
      .from("orders")
      .select("*, profiles!inner(full_name)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .not("designer_id", "is", null)

    if (!orders) return []

    // Agrupar por designer
    const grouped = new Map<string, any[]>()

    orders.forEach((order) => {
      const designerId = order.designer_id
      if (!grouped.has(designerId)) {
        grouped.set(designerId, [])
      }
      grouped.get(designerId)!.push(order)
    })

    return Array.from(grouped.entries()).map(([designerId, designerOrders]) => ({
      designerId,
      designerName: designerOrders[0].profiles?.full_name || 'Desconhecido',
      totalOrders: designerOrders.length,
      completedOrders: designerOrders.filter(o => o.status === 'finalizado').length,
      averageTime: 0, // Calcular baseado em activity_logs
      revenue: designerOrders.reduce((sum, o) => sum + (o.total_value || 0), 0),
    }))
  }

  // Relatório por cliente
  async getReportByClient(startDate: Date, endDate: Date): Promise<ClientReport[]> {
    const { data: orders } = await this.supabase
      .from("orders")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    if (!orders) return []

    // Agrupar por cliente
    const grouped = new Map<string, any[]>()

    orders.forEach((order) => {
      const clientName = order.client_name || 'Desconhecido'
      if (!grouped.has(clientName)) {
        grouped.set(clientName, [])
      }
      grouped.get(clientName)!.push(order)
    })

    return Array.from(grouped.entries()).map(([clientName, clientOrders]) => ({
      clientId: clientOrders[0].client_id || '',
      clientName,
      totalOrders: clientOrders.length,
      totalRevenue: clientOrders.reduce((sum, o) => sum + (o.total_value || 0), 0),
      averageOrderValue: clientOrders.reduce((sum, o) => sum + (o.total_value || 0), 0) / clientOrders.length,
    }))
  }

  // Relatório de produtividade
  async getProductivityReport(startDate: Date, endDate: Date) {
    const { data: orders } = await this.supabase
      .from("orders")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    if (!orders) return null

    const { data: activityLogs } = await this.supabase
      .from("activity_logs")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    return {
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'finalizado').length,
      completionRate: orders.length > 0 ? (orders.filter(o => o.status === 'finalizado').length / orders.length) * 100 : 0,
      totalActivityLogs: activityLogs?.length || 0,
      averageOrdersPerDay: orders.length / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    }
  }

  // Exportar para CSV
  async exportToCSV(data: any[], filename: string): Promise<void> {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
  }

  // Exportar para Excel (simplificado - usa CSV)
  async exportToExcel(data: any[], filename: string): Promise<void> {
    await this.exportToCSV(data, filename)
  }

  // Exportar para PDF (requer biblioteca externa)
  async exportToPDF(data: any[], filename: string): Promise<void> {
    // Placeholder - implementar com jsPDF ou similar
    console.log('Export to PDF:', filename, data)
  }
}

export const detailedReportsService = new DetailedReportsService()
