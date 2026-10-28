import { PrismaClient, ProdutoQuimico as ProdutoQuimicoRow } from '@prisma/client';
import { ClasseDeRisco } from '../../../domain/produto/ClasseDeRisco';
import { ProdutoQuimico } from '../../../domain/produto/ProdutoQuimico';
import {
  FiltroDeProdutos,
  ProdutoQuimicoRepository,
} from '../../../domain/produto/ProdutoQuimicoRepository';

function paraDominio(linha: ProdutoQuimicoRow): ProdutoQuimico {
  return ProdutoQuimico.restaurar({
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    numeroOnu: linha.numeroOnu,
    classeDeRisco: linha.classeDeRisco as ClasseDeRisco,
    grupoDeCompatibilidade: linha.grupoDeCompatibilidade,
    status: linha.status,
    criadoEm: linha.criadoEm,
    atualizadoEm: linha.atualizadoEm,
  });
}

export class PrismaProdutoQuimicoRepository implements ProdutoQuimicoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async salvar(produto: ProdutoQuimico): Promise<void> {
    const { id, ...dados } = produto.toProps();
    await this.prisma.produtoQuimico.upsert({
      where: { id },
      create: { id, ...dados },
      update: dados,
    });
  }

  async buscarPorId(id: string): Promise<ProdutoQuimico | null> {
    const linha = await this.prisma.produtoQuimico.findUnique({ where: { id } });
    return linha ? paraDominio(linha) : null;
  }

  async listar(filtro: FiltroDeProdutos = {}): Promise<ProdutoQuimico[]> {
    const linhas = await this.prisma.produtoQuimico.findMany({
      where: { status: filtro.status },
      orderBy: { criadoEm: 'desc' },
    });
    return linhas.map(paraDominio);
  }
}