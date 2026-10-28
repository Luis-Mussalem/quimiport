import { Prisma, PrismaClient } from '@prisma/client';
import { ConflitoError } from '../../../application/shared/ApplicationError';
import { CargaQuimica } from '../../../domain/carga/CargaQuimica';
import {
  CargaQuimicaRepository,
  FiltroDeCargas,
} from '../../../domain/carga/CargaQuimicaRepository';
import { DOCUMENTOS_OBRIGATORIOS } from '../../../domain/carga/DocumentoDaCarga';
import { Quantidade } from '../../../domain/carga/Quantidade';

const comFilhos = {
  documentos: true,
  historico: { orderBy: { ordem: 'asc' } },
} satisfies Prisma.CargaQuimicaInclude;

type CargaRow = Prisma.CargaQuimicaGetPayload<{ include: typeof comFilhos }>;

function paraDominio(linha: CargaRow): CargaQuimica {
  const quantidade = Quantidade.criar(linha.quantidade.toNumber(), linha.unidadeDeMedida);
  if (!quantidade.ok) throw quantidade.error;

  return CargaQuimica.restaurar({
    id: linha.id,
    codigo: linha.codigo,
    produtoId: linha.produtoId,
    quantidade: quantidade.value,
    origem: linha.origem,
    destino: linha.destino,
    responsavelTecnico: linha.responsavelTecnico,
    documentos: DOCUMENTOS_OBRIGATORIOS.map((tipo) => {
      const documento = linha.documentos.find((d) => d.tipo === tipo);
      return {
        tipo,
        apresentado: documento?.apresentado ?? false,
        apresentadoEm: documento?.apresentadoEm ?? null,
      };
    }),
    status: linha.status,
    dataDeEntrada: linha.dataDeEntrada,
    criadoEm: linha.criadoEm,
    atualizadoEm: linha.atualizadoEm,
    historico: linha.historico.map((h) => ({
      id: h.id,
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      motivo: h.motivo,
      ocorridoEm: h.ocorridoEm,
    })),
    versao: linha.versao,
  });
}

function codigoDuplicado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002';
}

export class PrismaCargaQuimicaRepository implements CargaQuimicaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Carga, documentos e histórico são gravados numa única transação:
  // ou tudo é salvo, ou nada é (o agregado nunca fica pela metade no banco).
  async salvar(carga: CargaQuimica): Promise<void> {
    const c = carga.toProps();
    const dadosDaCarga = {
      status: c.status,
      atualizadoEm: c.atualizadoEm,
    };
    const historico = c.historico.map((h, ordem) => ({
      id: h.id,
      cargaId: c.id,
      ordem,
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      motivo: h.motivo,
      ocorridoEm: h.ocorridoEm,
    }));

    try {
      await this.prisma.$transaction(async (tx) => {
        if (c.versao === 0) {
          await tx.cargaQuimica.create({
            data: {
              id: c.id,
              codigo: c.codigo,
              produtoId: c.produtoId,
              quantidade: c.quantidade.valor,
              unidadeDeMedida: c.quantidade.unidade,
              origem: c.origem,
              destino: c.destino,
              responsavelTecnico: c.responsavelTecnico,
              dataDeEntrada: c.dataDeEntrada,
              criadoEm: c.criadoEm,
              ...dadosDaCarga,
              documentos: { create: c.documentos },
            },
          });
          await tx.historicoStatusCarga.createMany({ data: historico });
          return;
        }

        // Atualização condicional: só grava se ninguém alterou a carga
        // depois que ela foi lida (a versão no banco ainda é a mesma).
        const { count } = await tx.cargaQuimica.updateMany({
          where: { id: c.id, versao: c.versao },
          data: { ...dadosDaCarga, versao: { increment: 1 } },
        });
        if (count === 0) {
          throw new ConflitoError(`A carga ${c.codigo} foi alterada por outra operação. Tente novamente.`);
        }

        for (const documento of c.documentos) {
          await tx.documentoCarga.update({
            where: { cargaId_tipo: { cargaId: c.id, tipo: documento.tipo } },
            data: { apresentado: documento.apresentado, apresentadoEm: documento.apresentadoEm },
          });
        }
        // O histórico só cresce: linhas que já existem são ignoradas.
        await tx.historicoStatusCarga.createMany({ data: historico, skipDuplicates: true });
      });
    } catch (erro) {
      if (codigoDuplicado(erro)) {
        throw new ConflitoError(`Já existe uma carga com o código ${c.codigo}`);
      }
      throw erro;
    }
  }

  async buscarPorId(id: string): Promise<CargaQuimica | null> {
    const linha = await this.prisma.cargaQuimica.findUnique({ where: { id }, include: comFilhos });
    return linha ? paraDominio(linha) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<CargaQuimica | null> {
    const linha = await this.prisma.cargaQuimica.findUnique({
      where: { codigo: codigo.trim().toUpperCase() },
      include: comFilhos,
    });
    return linha ? paraDominio(linha) : null;
  }

  async listar(filtro: FiltroDeCargas = {}): Promise<CargaQuimica[]> {
    const linhas = await this.prisma.cargaQuimica.findMany({
      where: { status: filtro.status, produtoId: filtro.produtoId },
      include: comFilhos,
      orderBy: { criadoEm: 'desc' },
    });
    return linhas.map(paraDominio);
  }
}