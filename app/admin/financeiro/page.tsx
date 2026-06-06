"use client"

import { useEffect, useState } from "react"
import {
  fetchExpenses,
  fetchRevenues,
  computeSummary,
  computeMonthlySeries,
  computeByCategory,
  formatCurrency,
  type Expense,
  type Revenue,
  type FinanceSummary,
  type MonthlyPoint,
  type CategoryPoint,
} from "@/lib/finance/finance-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CashflowChart } from "@/components/finance/cashflow-chart"
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { format } from "date-fns"

export default function FinanceiroPage() {
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([])
  const [revByCat, setRevByCat] = useState<CategoryPoint[]>([])
  const [expByCat, setExpByCat] = useState<CategoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [rev, exp] = await Promise.all([fetchRevenues(), fetchExpenses()])
      setRevenues(rev)
      setExpenses(exp)
      setSummary(computeSummary(rev, exp))
      setMonthly(computeMonthlySeries(rev, exp, 6))
      setRevByCat(computeByCategory(rev.map((r) => ({ category: r.category, amount: r.amount }))))
      setExpByCat(computeByCategory(exp.map((e) => ({ category: e.category, amount: e.amount }))))
    } catch (e) {
      console.log("[v0] erro financeiro:", e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Fluxo de caixa, DRE e contas</p>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <KpiCard icon={DollarSign} label="Faturamento" value={formatCurrency(summary.totalRevenue)} tone="green" />
          <KpiCard icon={Receipt} label="Despesas" value={formatCurrency(summary.totalExpense)} tone="red" />
          <KpiCard
            icon={TrendingUp}
            label={`Lucro (${summary.margin.toFixed(0)}%)`}
            value={formatCurrency(summary.netProfit)}
            tone={summary.netProfit >= 0 ? "emerald" : "red"}
          />
          <KpiCard icon={Wallet} label="Saldo a Receber" value={formatCurrency(summary.receivable)} tone="blue" />
        </div>
      )}

      {/* Fluxo de caixa + DRE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fluxo de Caixa</CardTitle>
            <p className="text-xs text-muted-foreground">Lucro líquido por mês</p>
          </CardHeader>
          <CardContent>
            <CashflowChart data={monthly} />
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">DRE Simplificado</CardTitle>
              <p className="text-xs text-muted-foreground">Resultado do período</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <DreLine label="(+) Receita Bruta" value={summary.totalRevenue} positive />
              <DreLine label="(-) Despesas Totais" value={-summary.totalExpense} />
              <div className="border-t border-border my-1" />
              <DreLine label="(=) Resultado Líquido" value={summary.netProfit} bold positive={summary.netProfit >= 0} />
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>Margem de lucro</span>
                <span className="font-medium text-foreground">{summary.margin.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Recebido / A receber</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(summary.received)} / {formatCurrency(summary.receivable)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pago / A pagar</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(summary.paid)} / {formatCurrency(summary.payable)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contas a receber / pagar */}
      <Tabs defaultValue="receber">
        <TabsList>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="categorias">Por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="receber" className="mt-4">
          <TransactionList
            items={revenues.map((r) => ({
              id: r.id,
              description: r.description,
              amount: r.amount,
              date: r.revenue_date ?? r.created_at,
              status: r.status,
              category: r.category,
            }))}
            type="revenue"
          />
        </TabsContent>

        <TabsContent value="pagar" className="mt-4">
          <TransactionList
            items={expenses.map((e) => ({
              id: e.id,
              description: e.description,
              amount: e.amount,
              date: e.expense_date ?? e.created_at,
              status: e.status,
              category: e.category,
            }))}
            type="expense"
          />
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
            <CategoryCard title="Receitas por Categoria" data={revByCat} tone="green" />
            <CategoryCard title="Despesas por Categoria" data={expByCat} tone="red" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: "green" | "red" | "emerald" | "blue"
}) {
  const tones: Record<string, string> = {
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold truncate">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DreLine({ label, value, bold, positive }: { label: string; value: number; bold?: boolean; positive?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={positive ? "text-emerald-600" : value < 0 ? "text-red-500" : "text-foreground"}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

const STATUS_VARIANT: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-600",
  received: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-yellow-500/10 text-yellow-600",
  cancelled: "bg-muted text-muted-foreground",
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Pago",
  received: "Recebido",
  pending: "Pendente",
  cancelled: "Cancelado",
}

function TransactionList({
  items,
  type,
}: {
  items: { id: string; description: string; amount: number; date: string; status: string; category: string | null }[]
  type: "revenue" | "expense"
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum lançamento {type === "revenue" ? "de receita" : "de despesa"} registrado.
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent className="p-0 divide-y divide-border">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-3 lg:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  type === "revenue" ? "bg-green-500/10" : "bg-red-500/10"
                }`}
              >
                {type === "revenue" ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{it.description}</p>
                <p className="text-xs text-muted-foreground">
                  {it.category ? `${it.category} • ` : ""}
                  {format(new Date(it.date), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <Badge variant="secondary" className={STATUS_VARIANT[it.status.toLowerCase()] ?? ""}>
                {STATUS_LABEL[it.status.toLowerCase()] ?? it.status}
              </Badge>
              <span className={`text-sm font-semibold ${type === "revenue" ? "text-green-600" : "text-red-600"}`}>
                {type === "revenue" ? "+" : "-"}
                {formatCurrency(it.amount)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function CategoryCard({ title, data, tone }: { title: string; data: CategoryPoint[]; tone: "green" | "red" }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p>
        ) : (
          data.map((d) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0
            return (
              <div key={d.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="capitalize">{d.category}</span>
                  <span className="font-medium">{formatCurrency(d.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${tone === "green" ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
