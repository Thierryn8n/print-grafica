'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen,
  Search,
  FileText,
  Image,
  FileArchive,
  Download,
  Calendar,
  User
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const fileTypeIcons: Record<string, any> = {
  image: Image,
  document: FileText,
  archive: FileArchive,
  default: FileText
}

const getFileCategory = (type: string) => {
  if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(type.toLowerCase())) return 'image'
  if (['zip', 'rar'].includes(type.toLowerCase())) return 'archive'
  return 'document'
}

export default function ArquivosPage() {
  const { orders } = useAppStore()
  const [search, setSearch] = useState('')

  // Collect all files from all orders
  const allFiles = orders.flatMap(order => 
    order.files.map(file => ({
      ...file,
      clientName: order.clientName,
      orderId: order.id
    }))
  )

  const filteredFiles = allFiles.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.clientName.toLowerCase().includes(search.toLowerCase())
  )

  // Group files by client
  const filesByClient = orders.reduce((acc, order) => {
    if (order.files.length > 0) {
      acc[order.clientName] = {
        files: order.files,
        orderId: order.id
      }
    }
    return acc
  }, {} as Record<string, { files: typeof orders[number]['files'], orderId: string }>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Arquivos</h1>
          </div>
          <p className="text-muted-foreground">
            Biblioteca de arquivos por cliente e pedido
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar arquivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass border-0 shadow-md">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allFiles.length}</p>
              <p className="text-xs text-muted-foreground">Total de Arquivos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-0 shadow-md">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Image className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {allFiles.filter(f => getFileCategory(f.type) === 'image').length}
              </p>
              <p className="text-xs text-muted-foreground">Imagens</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-0 shadow-md">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <FileArchive className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {allFiles.filter(f => getFileCategory(f.type) === 'archive').length}
              </p>
              <p className="text-xs text-muted-foreground">Arquivos ZIP</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files by Client */}
      {Object.keys(filesByClient).length === 0 ? (
        <Card className="glass border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum arquivo na biblioteca</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os arquivos enviados nos pedidos aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(filesByClient).map(([clientName, data]) => (
            <Card key={clientName} className="glass border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {clientName}
                  <Badge variant="outline" className="ml-auto">
                    {data.files.length} arquivos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.files.map((file) => {
                    const category = getFileCategory(file.type)
                    const Icon = fileTypeIcons[category]
                    
                    return (
                      <div 
                        key={file.id} 
                        className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          category === 'image' ? "bg-green-500/20" :
                          category === 'archive' ? "bg-purple-500/20" :
                          "bg-blue-500/20"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            category === 'image' ? "text-green-500" :
                            category === 'archive' ? "text-purple-500" :
                            "text-blue-500"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(file.uploadedAt), "dd/MM/yyyy", { locale: ptBR })}
                            {file.version && ` • v${file.version}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
