import { z } from 'zod';

export const idParams = z.object({
  id: z.uuid({ error: 'O id informado não é um UUID válido' }),
});

export const dataHora = z.string().meta({ format: 'date-time', example: '2026-10-28T14:00:00.000Z' });

export const erroResposta = z.object({
  erro: z.string().meta({ example: 'VALIDACAO' }),
  mensagem: z.string().meta({ example: 'Dados de entrada inválidos' }),
  detalhes: z
    .array(z.object({ campo: z.string(), mensagem: z.string() }))
    .optional()
    .meta({ example: [{ campo: 'nome', mensagem: 'O nome é obrigatório' }] }),
});
