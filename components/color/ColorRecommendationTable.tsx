"use client"

import { ColorMatchResult } from "@/lib/color/color-matching"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Download, AlertTriangle } from "lucide-react"
import { useState } from "react"

interface ColorRecommendationTableProps {
  matches: ColorMatchResult[]
  fabricMode: 'dry-fit' | 'helanca' | 'both'
}

export function ColorRecommendationTable({ matches, fabricMode }: ColorRecommendationTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(text)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return <Badge className="bg-green-500">Excelente</Badge>
      case 'good':
        return <Badge className="bg-blue-500">Boa</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500">Média</Badge>
      case 'poor':
        return <Badge variant="destructive">Baixa</Badge>
      default:
        return <Badge variant="secondary">{quality}</Badge>
    }
  }

  const copyAllCodes = () => {
    let text = "Códigos Recomendados para Sublimação\n\n"
    
    matches.forEach((match, index) => {
      text += `Cor ${index + 1}: ${match.detectedColor.hex}\n`
      if (match.dryFitMatch) {
        text += `  Dry-fit: ${match.dryFitMatch.corelCode || match.dryFitMatch.pantoneCode || 'N/A'} (Delta E: ${match.dryFitMatch.deltaE})\n`
      }
      if (match.helancaMatch) {
        text += `  Helanca: ${match.helancaMatch.corelCode || match.helancaMatch.pantoneCode || 'N/A'} (Delta E: ${match.helancaMatch.deltaE})\n`
      }
      text += "\n"
    })
    
    navigator.clipboard.writeText(text)
    setCopiedCode("all")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recomendações de Cores para Sublimação</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyAllCodes}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Todos
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cor da Imagem</TableHead>
                <TableHead>HEX</TableHead>
                <TableHead>% na Imagem</TableHead>
                {fabricMode !== 'helanca' && (
                  <>
                    <TableHead>Código Dry-fit</TableHead>
                    <TableHead>Cor Sublimada Dry-fit</TableHead>
                    <TableHead>Delta E</TableHead>
                    <TableHead>Aproximação</TableHead>
                  </>
                )}
                {fabricMode !== 'dry-fit' && (
                  <>
                    <TableHead>Código Helanca</TableHead>
                    <TableHead>Cor Sublimada Helanca</TableHead>
                    <TableHead>Delta E</TableHead>
                    <TableHead>Aproximação</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: match.detectedColor.hex }}
                      />
                      <span className="font-medium">Cor {index + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {match.detectedColor.hex.toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {match.detectedColor.percentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  
                  {fabricMode !== 'helanca' && (
                    <>
                      <TableCell>
                        {match.dryFitMatch ? (
                          <div className="space-y-1">
                            {match.dryFitMatch.corelCode && (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-sm">{match.dryFitMatch.corelCode}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(match.dryFitMatch?.corelCode!)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            {match.dryFitMatch.pantoneCode && !match.dryFitMatch.corelCode && (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-sm">{match.dryFitMatch.pantoneCode}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(match.dryFitMatch?.pantoneCode!)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {match.dryFitMatch ? (
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: match.dryFitMatch?.originalHex }}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {match.dryFitMatch ? (
                          <div className="space-y-1">
                            <span className="font-mono text-sm">{match.dryFitMatch.deltaE}</span>
                            {match.dryFitMatch?.quality === 'poor' && (
                              <div className="flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Teste físico</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {match.dryFitMatch ? (
                          <div className="space-y-1">
                            {getQualityBadge(match.dryFitMatch.quality)}
                            <span className="text-xs text-muted-foreground">
                              {match.dryFitMatch.matchPercentage.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </>
                  )}
                  
                  {fabricMode !== 'dry-fit' && (
                    <>
                      <TableCell>
                        {match.helancaMatch ? (
                          <div className="space-y-1">
                            {match.helancaMatch.corelCode && (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-sm">{match.helancaMatch.corelCode}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(match.helancaMatch?.corelCode!)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            {match.helancaMatch.pantoneCode && !match.helancaMatch.corelCode && (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-sm">{match.helancaMatch.pantoneCode}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(match.helancaMatch?.pantoneCode!)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {match.helancaMatch ? (
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: match.helancaMatch?.originalHex }}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {match.helancaMatch ? (
                          <div className="space-y-1">
                            <span className="font-mono text-sm">{match.helancaMatch.deltaE}</span>
                            {match.helancaMatch.quality === 'poor' && (
                              <div className="flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Teste físico</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {match.helancaMatch ? (
                          <div className="space-y-1">
                            {getQualityBadge(match.helancaMatch.quality)}
                            <span className="text-xs text-muted-foreground">
                              {match.helancaMatch.matchPercentage.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
