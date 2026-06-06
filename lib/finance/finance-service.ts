// Serviço de Gestão Financeira
import { createClient } from "@/lib/supabase/client"

export interface Expense {
  id: string
  description: string
  amount: number
  category: 'material' | 'equipamento' | 'servico' | 'folha' | 'aluguel' | 'energia' | 'internet' | 'outros'
  expense_date: string
  payment_method: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'transferencia' | 'boleto'
  status: 'pendente' | 'pago' | 'cancelado'
  due_date: string | null
  paid_at: string | null
  notes: string | null
  receipt_url: string | null
  created_at: string
}

export interface Revenue {
  id: string
  order_id: string | null
  client_id: string | null
  description: string
  amount: number
  category: 'venda' | 'servico' | 'outros'
  revenue_date: string
  payment_method: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'transferencia' | 'boleto'
  status: 'pendente' | 'recebido' | 'cancelado'
  due_date: string | null
  received_at: string | null
  notes: string | null
  created_at: string
}

export interface Budget {
  id: string
  name: string
  period_start: string
  period_end: string
  total_budget: number
  material_budget: number | null
  equipment_budget: number | null
  service_budget: number | null
  notes: string | null
  created_at: string
}

export class FinanceService {
  private supabase = createClient()

  // Despesas
  async createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const { data, error } = await this.supabase
      .from('expenses')
      .insert(expense)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getExpenses(filters?: { startDate?: string; endDate?: string; category?: string; status?: string }): Promise<Expense[]> {
    let query = this.supabase.from('expenses').select('*')

    if (filters?.startDate) {
      query = query.gte('expense_date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('expense_date', filters.endDate)
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('expense_date', { ascending: false })
    if (error) throw error
    return data || []
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const { data, error } = await this.supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteExpense(id: string): Promise<void> {
    const { error } = await this.supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  }

  // Receitas
  async createRevenue(revenue: Omit<Revenue, 'id' | 'created_at'>): Promise<Revenue> {
    const { data, error } = await this.supabase
      .from('revenues')
      .insert(revenue)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getRevenues(filters?: { startDate?: string; endDate?: string; category?: string; status?: string }): Promise<Revenue[]> {
    let query = this.supabase.from('revenues').select('*')

    if (filters?.startDate) {
      query = query.gte('revenue_date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('revenue_date', filters.endDate)
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('revenue_date', { ascending: false })
    if (error) throw error
    return data || []
  }

  async updateRevenue(id: string, updates: Partial<Revenue>): Promise<Revenue> {
    const { data, error } = await this.supabase
      .from('revenues')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteRevenue(id: string): Promise<void> {
    const { error } = await this.supabase.from('revenues').delete().eq('id', id)
    if (error) throw error
  }

  // Orçamentos
  async createBudget(budget: Omit<Budget, 'id' | 'created_at'>): Promise<Budget> {
    const { data, error } = await this.supabase
      .from('budgets')
      .insert(budget)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getBudgets(): Promise<Budget[]> {
    const { data, error } = await this.supabase
      .from('budgets')
      .select('*')
      .order('period_start', { ascending: false })

    if (error) throw error
    return data || []
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget> {
    const { data, error } = await this.supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteBudget(id: string): Promise<void> {
    const { error } = await this.supabase.from('budgets').delete().eq('id', id)
    if (error) throw error
  }

  // Resumo financeiro
  async getFinancialSummary(startDate: string, endDate: string) {
    const [expenses, revenues] = await Promise.all([
      this.getExpenses({ startDate, endDate }),
      this.getRevenues({ startDate, endDate })
    ])

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalRevenues = revenues.reduce((sum, r) => sum + r.amount, 0)
    const balance = totalRevenues - totalExpenses

    const expensesByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

    const revenuesByCategory = revenues.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.amount
      return acc
    }, {} as Record<string, number>)

    const pendingExpenses = expenses.filter(e => e.status === 'pendente').reduce((sum, e) => sum + e.amount, 0)
    const pendingRevenues = revenues.filter(r => r.status === 'pendente').reduce((sum, r) => sum + r.amount, 0)

    return {
      totalExpenses,
      totalRevenues,
      balance,
      expensesByCategory,
      revenuesByCategory,
      pendingExpenses,
      pendingRevenues
    }
  }
}

export const financeService = new FinanceService()
