import { FastifySchema } from 'fastify';
import { z, ZodType } from 'zod';

// Converte um schema Zod para JSON Schema no formato do OpenAPI 3.0.
// Assim o mesmo schema valida a requisição e alimenta o Swagger.
export function paraJsonSchema(schema: ZodType, io: 'input' | 'output' = 'input'): Record<string, unknown> {
  return z.toJSONSchema(schema, { target: 'openapi-3.0', io }) as Record<string, unknown>;
}

interface DocumentacaoDaRota {
  tags: string[];
  summary: string;
  description?: string;
  params?: ZodType;
  querystring?: ZodType;
  body?: ZodType;
  respostas: Record<number, { descricao: string; schema?: ZodType }>;
}

export type SchemaDaRota = FastifySchema & {
  tags: string[];
  summary: string;
  description?: string;
};

export function documentar(doc: DocumentacaoDaRota): SchemaDaRota {
  const response: Record<number, unknown> = {};
  for (const [codigo, { descricao, schema }] of Object.entries(doc.respostas)) {
    response[Number(codigo)] = schema
      ? { description: descricao, ...paraJsonSchema(schema, 'output') }
      : { description: descricao, type: 'null' };
  }

  const rota: SchemaDaRota = { tags: doc.tags, summary: doc.summary, response };
  if (doc.description) rota.description = doc.description;
  if (doc.params) rota.params = paraJsonSchema(doc.params);
  if (doc.querystring) rota.querystring = paraJsonSchema(doc.querystring);
  if (doc.body) rota.body = paraJsonSchema(doc.body);
  return rota;
}
