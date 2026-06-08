"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Image as ImageIcon, FileText, Palette, AlertCircle, CheckCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export function AIAnalysisPanel() {
  const [analyzing, setAnalyzing] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
    }
  }

  const handleAnalyze = async () => {
    if (!imageUrl) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem para análise",
        variant: "destructive",
      })
      return
    }

    setAnalyzing(true)
    try {
      // TODO: Call actual AI analysis function
      // const result = await analyzeImage(imageUrl)
      
      // Placeholder result
      setTimeout(() => {
        setAnalysisResult({
          resolution: { width: 3000, height: 2000, dpi: 300, isLowResolution: false },
          colors: { mode: "CMYK", hasPantone: false, spotColors: [] },
          fonts: { missing: [], embedded: ["Arial", "Helvetica"] },
          bleed: { hasBleed: true, isSufficient: true, recommendedBleed: 3 },
          issues: {
            critical: [],
            warning: [],
            suggestion: ["Consider adding a 3mm bleed for better print results"],
          },
          overallScore: 95,
        })
        setAnalyzing(false)
      }, 2000)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao analisar imagem",
        variant: "destructive",
      })
      setAnalyzing(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Análise de Arte com IA
        </CardTitle>
        <CardDescription>
          Use inteligência artificial para analisar suas artes e detectar problemas antes da impressão
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="analysis">Análise</TabsTrigger>
            <TabsTrigger value="text">Texto</TabsTrigger>
            <TabsTrigger value="colors">Cores</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Arraste uma imagem ou clique para selecionar
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button variant="outline" asChild>
                  <span>Selecionar Imagem</span>
                </Button>
              </label>
            </div>

            {imageUrl && (
              <div className="space-y-4">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full rounded-lg"
                />
                <Button onClick={handleAnalyze} disabled={analyzing} className="w-full">
                  {analyzing ? "Analisando..." : "Analisar com IA"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {analysisResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Pontuação Geral</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {analysisResult.overallScore}%
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Resolução</h4>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.resolution.width}x{analysisResult.resolution.height} @ {analysisResult.resolution.dpi} DPI
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Modo de Cor</h4>
                  <p className="text-sm text-muted-foreground">{analysisResult.colors.mode}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Sangria</h4>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.bleed.hasBleed ? "Sim" : "Não"} - {analysisResult.bleed.isSufficient ? "Suficiente" : "Insuficiente"}
                  </p>
                </div>

                {analysisResult.issues.critical.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      Erros Críticos
                    </h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {analysisResult.issues.critical.map((issue: string, index: number) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.issues.suggestion.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Sugestões</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {analysisResult.issues.suggestion.map((suggestion: string, index: number) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Carregue uma imagem e clique em "Analisar com IA" para ver os resultados
              </p>
            )}
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Gerar Descrição</label>
                <textarea
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                  placeholder="Descreva o produto para gerar uma descrição..."
                />
              </div>
              <Button className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Gerar Descrição com IA
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="colors" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tema</label>
                <select className="w-full p-3 border rounded-lg">
                  <option>Profissional</option>
                  <option>Criativo</option>
                  <option>Moderno</option>
                  <option>Clássico</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Mood</label>
                <select className="w-full p-3 border rounded-lg">
                  <option>Sóbrio</option>
                  <option>Vibrante</option>
                  <option>Neutro</option>
                  <option>Enérgico</option>
                </select>
              </div>
              <Button className="w-full">
                <Palette className="w-4 h-4 mr-2" />
                Sugerir Paleta de Cores
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
