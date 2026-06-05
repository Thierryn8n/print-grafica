"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Palette, Loader2, AlertCircle } from "lucide-react"
import { extractColorPaletteFromFile, DetectedColor } from "@/lib/color/color-extraction"
import { findBestMatchesForPalette } from "@/lib/color/color-matching"
import { getSublimatedSamplesForMatching } from "@/lib/color/supabase-color-service"
import { ColorPaletteResult } from "./ColorPaletteResult"
import { ColorRecommendationTable } from "./ColorRecommendationTable"

interface ColorAnalysisPanelProps {
  orderId?: string
  onAnalysisComplete?: (results: any) => void
}

export function ColorAnalysisPanel({ orderId, onAnalysisComplete }: ColorAnalysisPanelProps) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [fabricMode, setFabricMode] = useState<'dry-fit' | 'helanca' | 'both'>('both')
  const [colorCount, setColorCount] = useState<number>(8)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedColors, setDetectedColors] = useState<DetectedColor[]>([])
  const [matchResults, setMatchResults] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setError(null)
      
      // Criar preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAnalyze = async () => {
    if (!imageFile) {
      setError("Por favor, selecione uma imagem")
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setDetectedColors([])
    setMatchResults([])

    try {
      // Extrair paleta de cores
      const palette = await extractColorPaletteFromFile(imageFile, colorCount, 'kmeans')
      setDetectedColors(palette)

      // Buscar amostras sublimadas do banco
      const samples = await getSublimatedSamplesForMatching()

      // Encontrar melhores correspondências
      const matches = findBestMatchesForPalette(palette, samples, fabricMode)
      setMatchResults(matches)

      // Notificar componente pai
      if (onAnalysisComplete) {
        onAnalysisComplete({
          palette,
          matches,
          fabricMode,
          colorCount
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar imagem")
      console.error(err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setImageFile(null)
    setImagePreview(null)
    setDetectedColors([])
    setMatchResults([])
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Análise de Cores para Sublimação
        </CardTitle>
        <CardDescription>
          Analise a imagem de referência e descubra quais códigos Corel/Pantone usar para obter as cores mais próximas após a sublimação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload de Imagem */}
        <div className="space-y-2">
          <Label htmlFor="image-upload">Imagem de Referência *</Label>
          <div className="flex gap-4">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Selecionar
            </Button>
          </div>
        </div>

        {/* Preview da Imagem */}
        {imagePreview && (
          <div className="space-y-2">
            <Label>Prévia da Imagem</Label>
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-auto max-h-64 mx-auto rounded"
              />
            </div>
          </div>
        )}

        {/* Configurações da Análise */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fabric-mode">Tipo de Tecido</Label>
            <Select value={fabricMode} onValueChange={(value: any) => setFabricMode(value)}>
              <SelectTrigger id="fabric-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dry-fit">Dry-fit</SelectItem>
                <SelectItem value="helanca">Helanca</SelectItem>
                <SelectItem value="both">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color-count">Quantidade de Cores</Label>
            <Select value={colorCount.toString()} onValueChange={(value) => setColorCount(parseInt(value))}>
              <SelectTrigger id="color-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 cores</SelectItem>
                <SelectItem value="8">8 cores</SelectItem>
                <SelectItem value="12">12 cores</SelectItem>
                <SelectItem value="16">16 cores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={!imageFile || isAnalyzing}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Palette className="w-4 h-4 mr-2" />
                Analisar Cores
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isAnalyzing}
          >
            Limpar
          </Button>
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Resultados */}
        {detectedColors.length > 0 && (
          <div className="space-y-6">
            <ColorPaletteResult colors={detectedColors} />
            
            {matchResults.length > 0 && (
              <ColorRecommendationTable
                matches={matchResults}
                fabricMode={fabricMode}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
