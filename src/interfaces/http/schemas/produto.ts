import { z } from 'zod';
import { CLASSES_DE_RISCO } from '../../../domain/produto/ClasseDeRisco';
import { STATUS_DO_PRODUTO } from '../../../domain/produto/StatusDoProduto';
import { dataHora } from './comum';

// Validação de formato na borda. As regras de negócio continuam no domínio
// (ex.: o formato do número ONU é conferido pela entidade).
export const dadosDoProdutoBody = z
  .object({
    nome: z.string({ error: 'O nome é obrigatório' }).trim().min(1, 'O nome é obrigatório').max(150),
    descricao: z.string().trim().max(1000).nullish(),
    numeroOnu: z.string().trim().nullish(),
    classeDeRisco: z.enum(CLASSES_DE_RISCO, {
      error: 'A classe de risco é obrigatória e deve ser uma classe ONU válida (ex.: 3, 6.1, 8)',
    }),
    grupoDeCompatibilidade: z.string().trim().max(30).nullish(),
  })
  .meta({
    example: {
      nome: 'Ácido Sulfúrico',
      descricao: 'Ácido mineral forte, altamente corrosivo',
      numeroOnu: 'UN1830',
      classeDeRisco: '8',
      grupoDeCompatibilidade: null,
    },
  });

export const filtroDeProdutosQuery = z.object({
  status: z.enum(STATUS_DO_PRODUTO).optional(),
});

export const produtoResposta = z
  .object({
    id: z.uuid(),
    nome: z.string(),
    descricao: z.string().nullable(),
    numeroOnu: z.string().nullable(),
    classeDeRisco: z.string(),
    grupoDeCompatibilidade: z.string().nullable(),
    status: z.enum(STATUS_DO_PRODUTO),
    criadoEm: dataHora,
    atualizadoEm: dataHora,
  })
  .meta({
    example: {
      id: '3f1c2b9e-6a1d-4c8e-9b7a-2d5e8f0a1b2c',
      nome: 'Ácido Sulfúrico',
      descricao: 'Ácido mineral forte, altamente corrosivo',
      numeroOnu: 'UN1830',
      classeDeRisco: '8',
      grupoDeCompatibilidade: null,
      status: 'ATIVO',
      criadoEm: '2026-10-28T14:00:00.000Z',
      atualizadoEm: '2026-10-28T14:00:00.000Z',
    },
  });
