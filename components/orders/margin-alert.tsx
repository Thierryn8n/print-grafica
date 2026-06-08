import { AlertCircle, TrendingDown, TrendingUp, CheckCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { compareCostVsValue, formatMargin, formatCurrency, getMarginColor } from "@/lib/orders/profit-calculator"

interface MarginAlertProps {
  totalValue: number
  totalCost: number
  showDetails?: boolean
}

export function MarginAlert({ totalValue, totalCost, showDetails = false }: MarginAlertProps) {
  const comparison = compareCostVsValue(totalValue, totalCost)

  if (!comparison.warning && comparison.isProfitable) {
    return null
  }

  const getIcon = () => {
    if (!comparison.isProfitable) {
      return <AlertCircle className="h-4 w-4" />
    }
    if (comparison.marginLevel === "critical") {
      return <TrendingDown className="h-4 w-4" />
    }
    if (comparison.marginLevel === "low") {
      return <TrendingDown className="h-4 w-4" />
    }
    return <CheckCircle className="h-4 w-4" />
  }

  const getVariant = (): "destructive" | "default" | "warning" => {
    if (!comparison.isProfitable) return "destructive"
    if (comparison.marginLevel === "critical") return "destructive"
    if (comparison.marginLevel === "low") return "warning" as any
    return "default"
  }

  return (
    <Alert variant={getVariant()} className="border-l-4">
      {getIcon()}
      <AlertTitle className="flex items-center gap-2">
        {comparison.isProfitable ? "Margem Baixa" : "Prejuízo Detectado"}
        <Badge 
          variant="outline" 
          style={{ 
            borderColor: comparison.color, 
            color: comparison.color 
          }}
        >
          {formatMargin(comparison.margin)}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        {comparison.warning}
        {showDetails && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor total:</span>
              <span className="font-medium">{formatCurrency(comparison.totalValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo total:</span>
              <span className="font-medium">{formatCurrency(comparison.totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lucro estimado:</span>
              <span 
                className={`font-medium ${comparison.isProfitable ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(comparison.profit)}
              </span>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

interface MarginBadgeProps {
  totalValue: number
  totalCost: number
}

export function MarginBadge({ totalValue, totalCost }: MarginBadgeProps) {
  const comparison = compareCostVsValue(totalValue, totalCost)

  return (
    <Badge 
      variant="outline" 
      style={{ 
        borderColor: comparison.color, 
        color: comparison.color,
        backgroundColor: `${comparison.color}10`
      }}
    >
      {formatMargin(comparison.margin)}
    </Badge>
  )
}

interface MarginIndicatorProps {
  totalValue: number
  totalCost: number
  size?: "sm" | "md" | "lg"
}

export function MarginIndicator({ totalValue, totalCost, size = "md" }: MarginIndicatorProps) {
  const comparison = compareCostVsValue(totalValue, totalCost)
  
  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3"
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">Margem</span>
        <span style={{ color: comparison.color }}>{formatMargin(comparison.margin)}</span>
      </div>
      <div className={`w-full bg-muted rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div 
          className="h-full transition-all duration-300"
          style={{ 
            width: `${Math.min(Math.max(comparison.margin, 0), 100)}%`,
            backgroundColor: comparison.color
          }}
        />
      </div>
    </div>
  )
}
