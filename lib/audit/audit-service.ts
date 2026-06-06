// Serviço de Auditoria
import { createClient } from "@/lib/supabase/client"

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

export class AuditService {
  private supabase = createClient()

  // Registrar log manual
  async logAction(
    action: string,
    entityType: string,
    entityId: string | null = null,
    oldValues: Record<string, any> | null = null,
    newValues: Record<string, any> | null = null
  ): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    await this.supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues
    })
  }

  // Buscar logs de auditoria
  async getAuditLogs(filters?: {
    userId?: string
    entityType?: string
    entityId?: string
    action?: string
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<AuditLog[]> {
    let query = this.supabase
      .from('audit_logs')
      .select(`
        *,
        profiles (
          full_name,
          email
        )
      `)

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId)
    }

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    query = query.order('created_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    return data?.map(log => ({
      ...log,
      user: log.profiles
    })) || []
  }

  // Buscar logs por entidade
  async getEntityLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.getAuditLogs({ entityType, entityId })
  }

  // Buscar logs por usuário
  async getUserLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.getAuditLogs({ userId, limit })
  }

  // Buscar logs por período
  async getLogsByPeriod(startDate: string, endDate: string): Promise<AuditLog[]> {
    return this.getAuditLogs({ startDate, endDate })
  }

  // Buscar logs por ação
  async getLogsByAction(action: string, limit: number = 100): Promise<AuditLog[]> {
    return this.getAuditLogs({ action, limit })
  }

  // Exportar logs para CSV
  async exportLogsToCSV(logs: AuditLog[]): Promise<void> {
    if (logs.length === 0) {
      alert('Não há logs para exportar')
      return
    }

    const headers = ['ID', 'Usuário', 'Email', 'Ação', 'Entidade', 'ID Entidade', 'Data']
    const rows = logs.map(log => [
      log.id,
      log.user?.full_name || 'N/A',
      log.user?.email || 'N/A',
      log.action,
      log.entity_type,
      log.entity_id || 'N/A',
      new Date(log.created_at).toLocaleString('pt-BR')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Obter resumo de atividades
  async getActivitySummary(startDate: string, endDate: string): Promise<{
    totalLogs: number
    actionsCount: Record<string, number>
    entitiesCount: Record<string, number>
    usersCount: Record<string, number>
  }> {
    const logs = await this.getAuditLogs({ startDate, endDate })

    const actionsCount: Record<string, number> = {}
    const entitiesCount: Record<string, number> = {}
    const usersCount: Record<string, number> = {}

    logs.forEach(log => {
      actionsCount[log.action] = (actionsCount[log.action] || 0) + 1
      entitiesCount[log.entity_type] = (entitiesCount[log.entity_type] || 0) + 1
      if (log.user) {
        usersCount[log.user.full_name] = (usersCount[log.user.full_name] || 0) + 1
      }
    })

    return {
      totalLogs: logs.length,
      actionsCount,
      entitiesCount,
      usersCount
    }
  }
}

export const auditService = new AuditService()
