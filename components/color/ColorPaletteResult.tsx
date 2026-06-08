"use client"

import { DetectedColor } from "@/lib/color/color-extraction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ColorPaletteResultProps {
  colors: DetectedColor[]
}

export function ColorPaletteResult({ colors }: ColorPaletteResultProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paleta de Cores Detectada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {colors.map((color, index) => (
            <div
              key={index}
              className="space-y-2"
            >
              <div
                className="aspect-square rounded-lg shadow-md border-2 border-border"
                style={{ backgroundColor: color.hex }}
              />
              <div className="space-y-1">
                <div className="text-xs font-mono font-medium">
                  {color.hex.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">
                  RGB({color.rgb.r}, {color.rgb.g}, {color.rgb.b})
                </div>
                <Badge variant="secondary" className="text-xs">
                  {color.percentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
