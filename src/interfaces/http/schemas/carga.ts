import { z } from 'zod';
import { DOCUMENTOS_OBRIGATORIOS } from '../../../domain/carga/DocumentoDaCarga';
import { UNIDADES_DE_MEDIDA } from '../../../domain/carga/Quantidade';
import { STATUS_DA_CARGA } from '../../../domain/carga/StatusDaCarga';
import { dataHora } from './comum';

const textoObrigatorio = (campo: string, max: number) =>
  z.string({ error: `O campo ${campo} é obrigatório` }).trim().min(1, `O campo ${campo} é obrigatório`).max(max);

export const registrarCargaBody = z
  .object({
    codigo: textoObrigatorio('código', 40),
    produtoId: z.uuid({ error: 'O produto associado é obrigatório e deve ser um UUID válido' }),
    quantidade: z
      .number({ error: 'A quantidade é obrigatória e deve ser numérica' })
      .positive('A quantidade deve ser maior que zero'),
    unidadeDeMedida: z.enum(UNIDADES_DE_MEDIDA, { error: 'Unidade de medida inválida (use KG, T, L ou M3)' }),
    origem: textoObrigatorio('origem', 150),
    destino: textoObrigatorio('destino', 150),
    responsavelTecnico: textoObrigatorio('responsável técnico', 150),
    documentosApresentados: z.array(z.enum(DOCUMENTOS_OBRIGATORIOS)).default([]),
    dataDeEntrada: z.iso
      .datetime({ offset: true, error: 'Data de entrada inválida (use ISO 8601, ex.: 2026-10-28T08:00:00Z)' })
      .optional(),
  })
  .meta({
    example: {
      codigo: 'CQ-2026-0001',
      produtoId: '3f1c2b9e-6a1d-4c8e-9b7a-2d5e8f0a1b2c',
      quantidade: 1200,
      unidadeDeMedida: 'KG',
      origem: 'Navio MSC Aurora',
      destino: 'Terminal Alemoa - Armazém 12',
      responsavelTecnico: 'Eng. Maria Souza (CRQ 04123456)',
      documentosApresentados: ['FDS', 'FICHA_DE_EMERGENCIA'],
      dataDeEntrada: '2026-10-28T08:00:00Z',
    },
  });

export const filtroDeCargasQuery = z.object({
  status: z.enum(STATUS_DA_CARGA).optional(),
  produtoId: z.uuid({ error: 'produtoId deve ser um UUID válido' }).optional(),
});

export const alterarStatusBody = z
  .object({
    status: z.enum(STATUS_DA_CARGA, { error: `Status inválido (use: ${STATUS_DA_CARGA.join(', ')})` }),
    motivo: z.string().trim().max(500).optional(),
  })
  .meta({ example: { status: 'EM_ANALISE' } });

export const motivoBody = z
  .object({
    motivo: textoObrigatorio('motivo', 500),
  })
  .meta({ example: { motivo: 'Embalagem avariada na inspeção' } });

export const documentoBody = z
  .object({
    tipo: z.enum(DOCUMENTOS_OBRIGATORIOS, {
      error: `Tipo de documento inválido (use: ${DOCUMENTOS_OBRIGATORIOS.join(', ')})`,
    }),
    apresentado: z.boolean({ error: 'Informe se o documento foi apresentado (true/false)' }),
  })
  .meta({ example: { tipo: 'DECLARACAO_DE_MERCADORIA_PERIGOSA', apresentado: true } });

export const cargaResposta = z
  .object({
    id: z.uuid(),
    codigo: z.string(),
    produtoId: z.uuid(),
    quantidade: z.number(),
    unidadeDeMedida: z.enum(UNIDADES_DE_MEDIDA),
    origem: z.string(),
    destino: z.string(),
    responsavelTecnico: z.string(),
    status: z.enum(STATUS_DA_CARGA),
    documentacao: z.object({
      completa: z.boolean(),
      documentos: z.array(
        z.object({
          tipo: z.enum(DOCUMENTOS_OBRIGATORIOS),
          apresentado: z.boolean(),
          apresentadoEm: dataHora.nullable(),
        }),
      ),
    }),
    historico: z.array(
      z.object({
        statusAnterior: z.enum(STATUS_DA_CARGA).nullable(),
        statusNovo: z.enum(STATUS_DA_CARGA),
        motivo: z.string().nullable(),
        ocorridoEm: dataHora,
      }),
    ),
    dataDeEntrada: dataHora,
    criadoEm: dataHora,
    atualizadoEm: dataHora,
  })
  .meta({
    example: {
      id: '9b2e4c1a-7d3f-4e8a-b6c5-1a2b3c4d5e6f',
      codigo: 'CQ-2026-0001',
      produtoId: '3f1c2b9e-6a1d-4c8e-9b7a-2d5e8f0a1b2c',
      quantidade: 1200,
      unidadeDeMedida: 'KG',
      origem: 'Navio MSC Aurora',
      destino: 'Terminal Alemoa - Armazém 12',
      responsavelTecnico: 'Eng. Maria Souza (CRQ 04123456)',
      status: 'REGISTRADA',
      documentacao: {
        completa: false,
        documentos: [
          { tipo: 'FDS', apresentado: true, apresentadoEm: '2026-10-28T14:00:00.000Z' },
          { tipo: 'FICHA_DE_EMERGENCIA', apresentado: true, apresentadoEm: '2026-10-28T14:00:00.000Z' },
          { tipo: 'DECLARACAO_DE_MERCADORIA_PERIGOSA', apresentado: false, apresentadoEm: null },
        ],
      },
      historico: [
        { statusAnterior: null, statusNovo: 'REGISTRADA', motivo: null, ocorridoEm: '2026-10-28T14:00:00.000Z' },
      ],
      dataDeEntrada: '2026-10-28T08:00:00.000Z',
      criadoEm: '2026-10-28T14:00:00.000Z',
      atualizadoEm: '2026-10-28T14:00:00.000Z',
    },
  });
