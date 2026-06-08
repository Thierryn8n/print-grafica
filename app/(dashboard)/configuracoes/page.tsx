'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'
import {
  Settings,
  User,
  Bell,
  Palette,
  Database,
  Shield,
  Globe,
  Save
} from 'lucide-react'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Configurações</h1>
        </div>
        <p className="text-muted-foreground">
          Personalize o sistema conforme suas necessidades
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center p-2">
                <Image 
                  src="/images/logo.png" 
                  alt="Logo" 
                  width={64} 
                  height={64}
                  className="object-contain"
                />
              </div>
              <div>
                <Button variant="outline" size="sm">Alterar Logo</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input defaultValue="GN Sublimais" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" defaultValue="contato@gnsublimai.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input defaultValue="(11) 99999-0000" />
            </div>
            <Button className="w-full gap-2">
              <Save className="h-4 w-4" />
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Perfil do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input defaultValue="Graziela" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" defaultValue="graziela@gnsublimai.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha Atual</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button className="w-full gap-2">
              <Save className="h-4 w-4" />
              Atualizar Perfil
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Novos pedidos</p>
                <p className="text-sm text-muted-foreground">Receber alerta quando um novo pedido for criado</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Aprovações</p>
                <p className="text-sm text-muted-foreground">Receber alerta quando um cliente aprovar</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pedidos atrasados</p>
                <p className="text-sm text-muted-foreground">Receber alerta de pedidos com prazo vencido</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Arquivos enviados</p>
                <p className="text-sm text-muted-foreground">Receber alerta quando designers enviarem arquivos</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Aparência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Modo Escuro</p>
                <p className="text-sm text-muted-foreground">Alternar entre tema claro e escuro</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Animações</p>
                <p className="text-sm text-muted-foreground">Ativar animações na interface</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sons</p>
                <p className="text-sm text-muted-foreground">Reproduzir sons de notificação</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="glass border-0 shadow-lg border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Limpar dados de demonstração</p>
              <p className="text-sm text-muted-foreground">Remove todos os pedidos e dados de exemplo</p>
            </div>
            <Button variant="destructive">Limpar Dados</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Exportar dados</p>
              <p className="text-sm text-muted-foreground">Baixar todos os dados em formato JSON</p>
            </div>
            <Button variant="outline">Exportar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
