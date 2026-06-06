"use client"

import { Pie, PieChart, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Order, OrderStatus } from "@/lib/types"
import { ORDER_STATUS_LABELS } from "@/lib/types"

const STATUS_ORDER: OrderStatus[] = ["briefing", "design", "aprovacao", "producao", "finalizado"]
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

const chartConfig = {
  value: { label: "Pedidos" },
} satisfies ChartConfig

export function OrdersStatusChart({ orders }: { orders: Order[] }) {
  const data = STATUS_ORDER.map((status, i) => ({
    status,
    name: ORDER_STATUS_LABELS[status],
    value: orders.filter((o) => o.status === status).length,
    fill: COLORS[i],
  })).filter((d) => d.value > 0)

  const total = orders.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Pedidos por Etapa</CardTitle>
        <p className="text-xs text-muted-foreground">Distribuição atual</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            Sem pedidos para exibir
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {data.map((d) => (
            <div key={d.status} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
