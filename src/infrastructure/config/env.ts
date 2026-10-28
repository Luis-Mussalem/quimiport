import { existsSync } from 'node:fs';
import { z } from 'zod';

// As variáveis de ambiente também são "dados de fora": são validadas na
// inicialização para a aplicação falhar logo, com uma mensagem clara.
const esquemaDoAmbiente = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string({ error: 'DATABASE_URL é obrigatória' }).min(1, 'DATABASE_URL é obrigatória'),
});

export type Ambiente = z.infer<typeof esquemaDoAmbiente>;

export function carregarAmbiente(): Ambiente {
  // Em desenvolvimento lê o .env; no Docker e no CI as variáveis já vêm prontas.
  if (existsSync('.env')) process.loadEnvFile('.env');

  const resultado = esquemaDoAmbiente.safeParse(process.env);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Variáveis de ambiente inválidas: ${problemas}`);
  }
  return resultado.data;
}