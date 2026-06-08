// Serviço de Workflow Avançado
import { createClient } from "@/lib/supabase/client"

export interface WorkflowRule {
  id: string
  name: string
  description: string | null
  trigger_event: string
  trigger_status: string
  target_status: string
  conditions: Record<string, any>
  actions: Record<string, any>
  is_active: boolean
  priority: number
  created_at: string
}

export interface WorkflowExecution {
  id: string
  rule_id: string
  order_id: string
  triggered_by: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  execution_log: Record<string, any>
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface SLARule {
  id: string
  order_type: string
  priority: string
  max_hours: number
  warning_hours: number
  is_active: boolean
  created_at: string
}

export class WorkflowService {
  private supabase = createClient()

  // Regras de workflow
  async createRule(rule: Omit<WorkflowRule, 'id' | 'created_at'>): Promise<WorkflowRule> {
    const { data, error } = await this.supabase
      .from('workflow_rules')
      .insert(rule)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getRules(): Promise<WorkflowRule[]> {
    const { data, error } = await this.supabase
      .from('workflow_rules')
      .select('*')
      .order('priority', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getActiveRules(): Promise<WorkflowRule[]> {
    const { data, error } = await this.supabase
      .from('workflow_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) throw error
    return data || []
  }

  async updateRule(id: string, updates: Partial<WorkflowRule>): Promise<WorkflowRule> {
    const { data, error } = await this.supabase
      .from('workflow_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteRule(id: string): Promise<void> {
    const { error } = await this.supabase.from('workflow_rules').delete().eq('id', id)
    if (error) throw error
  }

  // Executar workflow
  async executeWorkflow(orderId: string, newStatus: string): Promise<void> {
    const rules = await this.getActiveRules()
    
    for (const rule of rules) {
      if (rule.trigger_status === newStatus) {
        await this.executeRule(rule, orderId)
      }
    }
  }

  private async executeRule(rule: WorkflowRule, orderId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    // Criar execução
    const { data: execution } = await this.supabase
      .from('workflow_executions')
      .insert({
        rule_id: rule.id,
        order_id: orderId,
        triggered_by: user.id,
        status: 'executing',
        execution_log: {}
      })
      .select()
      .single()

    try {
      // Verificar condições
      const conditionsMet = await this.checkConditions(rule.conditions, orderId)
      
      if (conditionsMet) {
        // Executar ações
        await this.executeActions(rule.actions, orderId)
        
        // Atualizar status do pedido se necessário
        if (rule.target_status) {
          await this.supabase
            .from('orders')
            .update({ status: rule.target_status })
            .eq('id', orderId)
        }

        // Marcar execução como concluída
        await this.supabase
          .from('workflow_executions')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', execution.id)
      } else {
        await this.supabase
          .from('workflow_executions')
          .update({ 
            status: 'completed',
            execution_log: { message: 'Condições não atendidas' }
          })
          .eq('id', execution.id)
      }
    } catch (error) {
      await this.supabase
        .from('workflow_executions')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido'
        })
        .eq('id', execution.id)
    }
  }

  private async checkConditions(conditions: Record<string, any>, orderId: string): Promise<boolean> {
    // Buscar pedido
    const { data: order } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order) return false

    // Verificar cada condição
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'priority' && order.priority !== value) return false
      if (key === 'product_type' && order.product_type !== value) return false
      if (key === 'min_quantity' && order.quantity < value) return false
      if (key === 'max_quantity' && order.quantity > value) return false
    }

    return true
  }

  private async executeActions(actions: Record<string, any>, orderId: string): Promise<void> {
    // Notificar designer
    if (actions.notify_designer) {
      const { data: order } = await this.supabase
        .from('orders')
        .select('designer_id')
        .eq('id', orderId)
        .single()

      if (order?.designer_id) {
        await this.supabase.from('notifications').insert({
          user_id: order.designer_id,
          title: actions.notification_title || 'Atualização de Pedido',
          message: actions.notification_message || 'O status do pedido foi atualizado',
          type: 'info'
        })
      }
    }

    // Notificar cliente
    if (actions.notify_client) {
      const { data: order } = await this.supabase
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .single()

      if (order?.client_id) {
        // Implementar notificação por email ou WhatsApp
        console.log('Notificar cliente:', order.client_id)
      }
    }

    // Criar tarefa
    if (actions.create_task) {
      // Implementar criação de tarefa
      console.log('Criar tarefa para pedido:', orderId)
    }
  }

  // Histórico de execuções
  async getExecutions(orderId?: string): Promise<WorkflowExecution[]> {
    let query = this.supabase
      .from('workflow_executions')
      .select('*')

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  // Regras de SLA
  async createSLARule(sla: Omit<SLARule, 'id' | 'created_at'>): Promise<SLARule> {
    const { data, error } = await this.supabase
      .from('sla_rules')
      .insert(sla)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getSLARules(): Promise<SLARule[]> {
    const { data, error } = await this.supabase
      .from('sla_rules')
      .select('*')
      .eq('is_active', true)

    if (error) throw error
    return data || []
  }

  async checkSLAViolations(): Promise<any[]> {
    const slaRules = await this.getSLARules()
    const violations: any[] = []

    for (const sla of slaRules) {
      const { data: orders } = await this.supabase
        .from('orders')
        .select('*')
        .eq('product_type', sla.order_type)
        .eq('priority', sla.priority)
        .in('status', ['novo-pedido', 'em-criacao', 'mockup-pronto'])

      for (const order of orders || []) {
        const createdDate = new Date(order.created_at)
        const hoursElapsed = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60)

        if (hoursElapsed > sla.max_hours) {
          violations.push({
            order_id: order.id,
            order_number: order.order_number,
            sla_type: sla.order_type,
            priority: sla.priority,
            hours_elapsed: hoursElapsed,
            max_hours: sla.max_hours,
            violation_hours: hoursElapsed - sla.max_hours
          })
        }
      }
    }

    return violations
  }

  // Escalamento automático
  async escalateOrder(orderId: string, reason: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    // Notificar admin
    const { data: admins } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('status', 'approved')

    for (const admin of admins || []) {
      await this.supabase.from('notifications').insert({
        user_id: admin.id,
        title: 'Escalamento de Pedido',
        message: `Pedido escalado: ${reason}`,
        type: 'warning',
        link: `/admin/pedidos/${orderId}`
      })
    }
  }
}

export const workflowService = new WorkflowService()
