// Serviço de Relatórios Detalhados
import { createClient } from "@/lib/supabase/client"

export interface ReportFilters {
  startDate?: string
  endDate?: string
  designerId?: string
  clientId?: string
  status?: string
  priority?: string
}

export interface OrderReport {
  id: string
  order_number: string
  client_name: string
  product_type: string
  quantity: number
  status: string
  priority: string
  total_value: number
  created_at: string
  deadline: string | null
  designer_name?: string
}

export interface ProductivityReport {
  designer_id: string
  designer_name: string
  total_orders: number
  completed_orders: number
  in_progress_orders: number
  total_value: number
  average_completion_time_hours: number
}

export interface ClientReport {
  client_id: string
  client_name: string
  total_orders: number
  total_value: number
  last_order_date: string
  average_order_value: number
}

export class ReportsService {
  private supabase = createClient()

  // Relatório de pedidos por período
  async getOrdersByPeriod(filters: ReportFilters): Promise<OrderReport[]> {
    let query = this.supabase
      .from('orders')
      .select(`
        id,
        order_number,
        client_name,
        product_type,
        quantity,
        status,
        priority,
        total_value,
        created_at,
        deadline,
        profiles!inner (
          full_name
        )
      `)

    // Filtro de designer
    if (filters.designerId) {
      query = query.eq('designer_id', filters.designerId)
    }

    // Filtro de status
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    // Filtro de prioridade
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Filtrar por data no cliente (se necessário)
    let filteredData = data
    if (filters.startDate || filters.endDate) {
      filteredData = data?.filter(order => {
        const orderDate = new Date(order.created_at)
        if (filters.startDate && orderDate < new Date(filters.startDate)) return false
        if (filters.endDate && orderDate > new Date(filters.endDate)) return false
        return true
      })
    }

    return filteredData?.map(order => ({
      id: order.id,
      order_number: order.order_number,
      client_name: order.client_name,
      product_type: order.product_type,
      quantity: order.quantity,
      status: order.status,
      priority: order.priority,
      total_value: order.total_value || 0,
      created_at: order.created_at,
      deadline: order.deadline,
      designer_name: (order.profiles as any)?.full_name
    })) || []
  }

  // Relatório de produtividade por designer
  async getProductivityByDesigner(filters: ReportFilters): Promise<ProductivityReport[]> {
    let query = this.supabase
      .from('orders')
      .select(`
        designer_id,
        profiles!inner (
          full_name
        ),
        status,
        total_value,
        created_at,
        deadline
      `)

    const { data, error } = await query

    if (error) throw error

    // Filtrar por data no cliente (se necessário)
    let filteredData = data
    if (filters.startDate || filters.endDate) {
      filteredData = data?.filter(order => {
        const orderDate = new Date(order.created_at)
        if (filters.startDate && orderDate < new Date(filters.startDate)) return false
        if (filters.endDate && orderDate > new Date(filters.endDate)) return false
        return true
      })
    }

    // Agrupar por designer
    const designerStats = new Map<string, any>()

    filteredData?.forEach(order => {
      const designerId = order.designer_id
      const designerName = (order.profiles as any)?.full_name || 'Sem nome'

      if (!designerStats.has(designerId)) {
        designerStats.set(designerId, {
          designer_id: designerId,
          designer_name: designerName,
          total_orders: 0,
          completed_orders: 0,
          in_progress_orders: 0,
          total_value: 0,
          completion_times: []
        })
      }

      const stats = designerStats.get(designerId)
      stats.total_orders++
      stats.total_value += order.total_value || 0

      if (order.status === 'finalizado' || order.status === 'entregue') {
        stats.completed_orders++
        if (order.deadline) {
          const completionTime = new Date(order.created_at).getTime() - new Date(order.deadline).getTime()
          stats.completion_times.push(Math.abs(completionTime) / (1000 * 60 * 60))
        }
      } else {
        stats.in_progress_orders++
      }
    })

    // Calcular médias
    const reports: ProductivityReport[] = []
    designerStats.forEach((stats) => {
      const avgCompletionTime = stats.completion_times.length > 0
        ? stats.completion_times.reduce((a: number, b: number) => a + b, 0) / stats.completion_times.length
        : 0

      reports.push({
        designer_id: stats.designer_id,
        designer_name: stats.designer_name,
        total_orders: stats.total_orders,
        completed_orders: stats.completed_orders,
        in_progress_orders: stats.in_progress_orders,
        total_value: stats.total_value,
        average_completion_time_hours: avgCompletionTime
      })
    })

    return reports
  }

  // Relatório por cliente
  async getReportByClient(filters: ReportFilters): Promise<ClientReport[]> {
    let query = this.supabase
      .from('orders')
      .select(`
        client_id,
        client_name,
        total_value,
        created_at
      `)

    // Filtro de cliente específico
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Filtrar por data no cliente (se necessário)
    let filteredData = data
    if (filters.startDate || filters.endDate) {
      filteredData = data?.filter(order => {
        const orderDate = new Date(order.created_at)
        if (filters.startDate && orderDate < new Date(filters.startDate)) return false
        if (filters.endDate && orderDate > new Date(filters.endDate)) return false
        return true
      })
    }

    // Agrupar por cliente
    const clientStats = new Map<string, any>()

    filteredData?.forEach(order => {
      const clientId = order.client_id || 'unknown'
      const clientName = order.client_name

      if (!clientStats.has(clientId)) {
        clientStats.set(clientId, {
          client_id: clientId,
          client_name: clientName,
          total_orders: 0,
          total_value: 0,
          order_dates: []
        })
      }

      const stats = clientStats.get(clientId)
      stats.total_orders++
      stats.total_value += order.total_value || 0
      stats.order_dates.push(order.created_at)
    })

    // Calcular médias
    const reports: ClientReport[] = []
    clientStats.forEach((stats) => {
      const lastOrderDate = stats.order_dates.length > 0
        ? stats.order_dates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null

      reports.push({
        client_id: stats.client_id,
        client_name: stats.client_name,
        total_orders: stats.total_orders,
        total_value: stats.total_value,
        last_order_date: lastOrderDate || '',
        average_order_value: stats.total_orders > 0 ? stats.total_value / stats.total_orders : 0
      })
    })

    return reports.sort((a, b) => b.total_value - a.total_value)
  }

  // Resumo geral
  async getGeneralSummary(filters: ReportFilters) {
    let query = this.supabase
      .from('orders')

    const { data, error } = await query.select('total_value, status, created_at')

    if (error) throw error

    // Filtrar por data no cliente (se necessário)
    let filteredData = data
    if (filters.startDate || filters.endDate) {
      filteredData = data?.filter(order => {
        const orderDate = new Date(order.created_at)
        if (filters.startDate && orderDate < new Date(filters.startDate)) return false
        if (filters.endDate && orderDate > new Date(filters.endDate)) return false
        return true
      })
    }

    const totalOrders = filteredData?.length || 0
    const totalValue = filteredData?.reduce((sum, order) => sum + (order.total_value || 0), 0) || 0

    const statusCounts = filteredData?.reduce((acc: any, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {}) || {}

    return {
      totalOrders,
      totalValue,
      statusCounts,
      averageOrderValue: totalOrders > 0 ? totalValue / totalOrders : 0
    }
  }

  // Exportar relatório para CSV
  exportToCSV(data: any[], filename: string): void {
    if (data.length === 0) {
      alert('Não há dados para exportar')
      return
    }

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header]
        // Escapar valores com vírgulas
        const stringValue = typeof value === 'string' ? value : String(value)
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export const reportsService = new ReportsService()
