# PrintFlow Studio - Documentação Técnica

## Visão Geral

PrintFlow Studio é um sistema completo de gestão de produção gráfica para gráficas de sublimação, desenvolvido com Next.js, Supabase e TypeScript.

## Arquitetura

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Ícones**: Lucide React
- **Estado**: React Hooks + Context API

### Backend
- **Banco de Dados**: PostgreSQL via Supabase
- **Autenticação**: Supabase Auth
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime

## Estrutura do Projeto

```
plataforma-grafica-completa/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Rotas do dashboard
│   ├── admin/             # Rotas do admin
│   ├── designer/          # Rotas do designer
│   ├── api/               # API Routes
│   └── auth/              # Rotas de autenticação
├── components/            # Componentes React
│   ├── ui/               # Componentes shadcn/ui
│   ├── notifications/    # Componentes de notificações
│   └── ...
├── lib/                  # Utilitários e serviços
│   ├── ai/              # Serviços de IA
│   ├── api/             # Serviços de API
│   ├── chat/            # Serviços de chat
│   ├── finance/         # Serviços financeiros
│   ├── orders/          # Serviços de pedidos
│   ├── security/        # Serviços de segurança
│   ├── themes/          # Sistema de temas
│   └── ...
├── supabase/            # Configurações do Supabase
│   ├── schema.sql       # Schema do banco de dados
│   └── migrations/      # Migrations SQL
└── tests/               # Testes
    ├── unit/           # Testes unitários
    ├── integration/    # Testes de integração
    └── e2e/           # Testes E2E
```

## Módulos Implementados

### Módulos 1-20 (Core)
1. Gestão de Pedidos Avançada
2. Importação em Massa Excel
3. Uniformes Esportivos
4. Gerador de Artes Variáveis
5. Template Engine
6. Gerador PDF em Massa
7. Fila de Produção (Kanban)
8. Aprovação Online Profissional
9. Gestão de Arquivos (DAM)
10. Dashboard Executivo
11. Financeiro
12. CRM
13. Integração CorelDRAW
14. API de Automação
15. Multiempresa (SaaS)
16. IA para Artes
17. Banco de Dados
18. Performance
19. Segurança
20. Experiência de Usuário

### Módulos 21-40 (Avançados)
21. Notificações em Tempo Real
22. Chat/Mensagens
23. Upload de Arquivos Robusto
24. Relatórios Detalhados
25. Gestão Financeira Completa
26. Gestão de Estoque
27. Gestão de Impressoras
28. Workflow Avançado
29. Integrações Externas
30. Mobile App (React Native)
31. API REST Completa
32. Testes
33. Documentação
34. Monitoramento
35. Backup
36. Multi-idioma
37. Temas
38. Permissões Granular
39. Auditoria Completa
40. Calendário

## API REST

### Autenticação
Todas as requisições devem incluir o header:
```
Authorization: Bearer <token>
```

### Endpoints Principais

#### Pedidos
- `GET /api/v1/orders` - Listar pedidos
- `POST /api/v1/orders` - Criar pedido
- `GET /api/v1/orders/{id}` - Obter pedido
- `GET /api/v1/orders/{id}/export?format=csv` - Exportar pedido

#### Documentação
- `GET /api/v1/docs` - OpenAPI/Swagger documentation

## Configuração

### Variáveis de Ambiente
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
```

## Instalação

```bash
npm install
npm run dev
```

## Deploy

O projeto está configurado para deploy no Vercel.
