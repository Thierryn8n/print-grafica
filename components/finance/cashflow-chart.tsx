"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { MonthlyPoint } from "@/lib/finance/finance-service"
import { formatCurrency } from "@/lib/finance/finance-service"

const chartConfig = {
  lucro: { label: "Lucro", color: "var(--chart-2)" },
} satisfies ChartConfig

export function CashflowChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillLucro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-lucro)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-lucro)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
        />
        <Area
          dataKey="lucro"
          type="monotone"
          fill="url(#fillLucro)"
          stroke="var(--color-lucro)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
