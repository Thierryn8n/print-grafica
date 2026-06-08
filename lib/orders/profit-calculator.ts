/**
 * Profit calculation and margin analysis for orders
 */

/**
 * Profit margin thresholds
 */
export const MARGIN_THRESHOLDS = {
  CRITICAL: 10, // Below 10% is critical
  LOW: 20, // Below 20% is low
  GOOD: 30, // Above 30% is good
  EXCELLENT: 50, // Above 50% is excellent
} as const

/**
 * Calculate estimated profit for an order
 */
export function calculateEstimatedProfit(totalValue: number, totalCost: number): number {
  if (totalValue <= 0 || totalCost < 0) {
    return 0
  }
  return totalValue - totalCost
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(totalValue: number, totalCost: number): number {
  if (totalValue <= 0) {
    return 0
  }
  const profit = calculateEstimatedProfit(totalValue, totalCost)
  return (profit / totalValue) * 100
}

/**
 * Get margin level based on percentage
 */
export function getMarginLevel(margin: number): "critical" | "low" | "good" | "excellent" {
  if (margin < MARGIN_THRESHOLDS.CRITICAL) return "critical"
  if (margin < MARGIN_THRESHOLDS.LOW) return "low"
  if (margin < MARGIN_THRESHOLDS.GOOD) return "low"
  if (margin < MARGIN_THRESHOLDS.EXCELLENT) return "good"
  return "excellent"
}

/**
 * Get margin color for UI
 */
export function getMarginColor(margin: number): string {
  const level = getMarginLevel(margin)
  switch (level) {
    case "critical":
      return "#ef4444" // red
    case "low":
      return "#f59e0b" // amber
    case "good":
      return "#22c55e" // green
    case "excellent":
      return "#10b981" // emerald
  }
}

/**
 * Check if margin is low (below threshold)
 */
export function isMarginLow(margin: number, threshold: number = MARGIN_THRESHOLDS.LOW): boolean {
  return margin < threshold
}

/**
 * Get margin warning message
 */
export function getMarginWarning(margin: number): string | null {
  if (margin < MARGIN_THRESHOLDS.CRITICAL) {
    return "Margem crítica! O lucro é muito baixo em relação ao valor do pedido."
  }
  if (margin < MARGIN_THRESHOLDS.LOW) {
    return "Margem baixa. Considere revisar os custos ou aumentar o valor."
  }
  return null
}

/**
 * Calculate cost breakdown for an order
 */
export interface CostBreakdown {
  materials: number
  labor: number
  overhead: number
  other: number
  total: number
}

export function calculateCostBreakdown(
  materialsCost: number,
  laborCost: number,
  overheadRate: number = 0.15, // 15% overhead
  otherCosts: number = 0
): CostBreakdown {
  const overhead = (materialsCost + laborCost) * overheadRate
  const total = materialsCost + laborCost + overhead + otherCosts

  return {
    materials: materialsCost,
    labor: laborCost,
    overhead,
    other: otherCosts,
    total,
  }
}

/**
 * Compare cost vs value
 */
export interface CostValueComparison {
  totalValue: number
  totalCost: number
  profit: number
  margin: number
  marginLevel: "critical" | "low" | "good" | "excellent"
  isProfitable: boolean
  warning: string | null
  color: string
}

export function compareCostVsValue(
  totalValue: number,
  totalCost: number
): CostValueComparison {
  const profit = calculateEstimatedProfit(totalValue, totalCost)
  const margin = calculateProfitMargin(totalValue, totalCost)
  const marginLevel = getMarginLevel(margin)

  return {
    totalValue,
    totalCost,
    profit,
    margin,
    marginLevel,
    isProfitable: profit > 0,
    warning: getMarginWarning(margin),
    color: getMarginColor(margin),
  }
}

/**
 * Format margin as percentage
 */
export function formatMargin(margin: number): string {
  return `${margin.toFixed(1)}%`
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

/**
 * Calculate profit for multiple orders
 */
export function calculateTotalProfit(orders: Array<{ total_value: number; custo_total: number }>): {
  totalValue: number
  totalCost: number
  totalProfit: number
  averageMargin: number
} {
  const totalValue = orders.reduce((sum, order) => sum + (order.total_value || 0), 0)
  const totalCost = orders.reduce((sum, order) => sum + (order.custo_total || 0), 0)
  const totalProfit = totalValue - totalCost
  const averageMargin = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0

  return {
    totalValue,
    totalCost,
    totalProfit,
    averageMargin,
  }
}
