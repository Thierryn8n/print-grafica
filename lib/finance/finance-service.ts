// Serviço de Gestão Financeira
import { createClient } from "@/lib/supabase/client"

export interface Expense {
  id: string
  description: string
  amount: number
  category: 'material' | 'equipamento' | 'servico' | 'folha' | 'aluguel' | 'energia' | 'internet' | 'outros'
  expense_date: string
  payment_method: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'transferencia' | 'boleto'
  status: 'pending' | 'paid' | 'cancelled'
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
  status: 'pending' | 'received' | 'cancelled'
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

// ===== Helpers de análise (DRE, séries, categorias) =====

export interface FinanceSummary {
  totalRevenue: number
  totalExpense: number
  netProfit: number
  margin: number
  receivable: number
  payable: number
  received: number
  paid: number
}

export interface MonthlyPoint {
  month: string
  receita: number
  despesa: number
  lucro: number
}

export interface CategoryPoint {
  category: string
  value: number
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export async function fetchRevenues(): Promise<Revenue[]> {
  return financeService.getRevenues()
}

export async function fetchExpenses(): Promise<Expense[]> {
  return financeService.getExpenses()
}

export function computeSummary(revenues: Revenue[], expenses: Expense[]): FinanceSummary {
  const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit = totalRevenue - totalExpense
  const received = revenues.filter((r) => r.status === "received").reduce((s, r) => s + Number(r.amount), 0)
  const receivable = revenues.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0)
  const paid = expenses.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0)
  const payable = expenses.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0)
  return {
    totalRevenue,
    totalExpense,
    netProfit,
    margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    receivable,
    payable,
    received,
    paid,
  }
}

export function computeMonthlySeries(revenues: Revenue[], expenses: Expense[], monthsBack = 6): MonthlyPoint[] {
  const now = new Date()
  const points: MonthlyPoint[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const receita = revenues
      .filter((r) => {
        const dt = new Date(r.revenue_date ?? r.created_at)
        return `${dt.getFullYear()}-${dt.getMonth()}` === key
      })
      .reduce((s, r) => s + Number(r.amount), 0)
    const despesa = expenses
      .filter((e) => {
        const dt = new Date(e.expense_date ?? e.created_at)
        return `${dt.getFullYear()}-${dt.getMonth()}` === key
      })
      .reduce((s, e) => s + Number(e.amount), 0)
    points.push({ month: MONTH_LABELS[d.getMonth()], receita, despesa, lucro: receita - despesa })
  }
  return points
}

export function computeByCategory(items: { category: string | null; amount: number }[]): CategoryPoint[] {
  const map = new Map<string, number>()
  for (const it of items) {
    const cat = it.category || "Sem categoria"
    map.set(cat, (map.get(cat) ?? 0) + Number(it.amount))
  }
  return Array.from(map.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}
