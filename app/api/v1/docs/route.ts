// API REST Documentation - MÓDULO 31
// OpenAPI/Swagger documentation

import { NextResponse } from "next/server"

export const dynamic = "force-static"

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "PrintFlow Studio API",
    version: "1.0.0",
    description: "API REST para integrações externas do sistema PrintFlow Studio",
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      description: "Servidor de desenvolvimento",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/api/v1/orders": {
      get: {
        summary: "Listar pedidos",
        description: "Retorna uma lista de pedidos com filtros opcionais",
        tags: ["Pedidos"],
        parameters: [
          {
            name: "status",
            in: "query",
            description: "Filtro por status",
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            description: "Limite de resultados",
            schema: { type: "integer", default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Lista de pedidos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Order" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Criar pedido",
        description: "Cria um novo pedido",
        tags: ["Pedidos"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Pedido criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
        },
      },
    },
    "/api/v1/orders/{id}": {
      get: {
        summary: "Obter pedido",
        description: "Retorna detalhes de um pedido específico",
        tags: ["Pedidos"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Detalhes do pedido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
        },
      },
    },
    "/api/v1/orders/{id}/export": {
      get: {
        summary: "Exportar pedido",
        description: "Exporta dados do pedido para CorelDRAW (CSV/JSON/XML)",
        tags: ["Pedidos"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "format",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["csv", "json", "xml"] },
          },
        ],
        responses: {
          "200": {
            description: "Arquivo exportado",
            content: {
              "text/csv": { schema: { type: "string" } },
              "application/json": { schema: { type: "object" } },
              "application/xml": { schema: { type: "string" } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Order: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          order_number: { type: "string" },
          client_name: { type: "string" },
          product_type: { type: "string" },
          quantity: { type: "integer" },
          status: { type: "string" },
          total_value: { type: "number" },
          deadline: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      OrderCreate: {
        type: "object",
        required: ["client_name", "product_type", "quantity"],
        properties: {
          client_name: { type: "string" },
          product_type: { type: "string" },
          quantity: { type: "integer" },
          deadline: { type: "string", format: "date-time" },
          notes: { type: "string" },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(openApiSpec)
}
