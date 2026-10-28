import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ConflitoError } from '../../../src/application/shared/ApplicationError';
import { PrismaCargaQuimicaRepository } from '../../../src/infrastructure/persistence/prisma/PrismaCargaQuimicaRepository';
import { PrismaProdutoQuimicoRepository } from '../../../src/infrastructure/persistence/prisma/PrismaProdutoQuimicoRepository';
import { umaCargaEm, umProdutoAtivo } from '../../support/builders';

const url = process.env.TEST_DATABASE_URL;

// Testes contra um PostgreSQL de verdade (schema "test").
// Ficam num arquivo só para não rodarem em paralelo no mesmo banco.
describe.skipIf(!url)('Repositórios Prisma (PostgreSQL)', () => {
  const prisma = new PrismaClient({ datasourceUrl: url });
  const produtos = new PrismaProdutoQuimicoRepository(prisma);
  const cargas = new PrismaCargaQuimicaRepository(prisma);

  beforeEach(async () => {
    await prisma.historicoStatusCarga.deleteMany();
    await prisma.documentoCarga.deleteMany();
    await prisma.cargaQuimica.deleteMany();
    await prisma.produtoQuimico.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('produto', () => {
    it('salva, busca e atualiza um produto', async () => {
      const produto = umProdutoAtivo({ descricao: 'Soda cáustica' });
      await produtos.salvar(produto);

      produto.inativar();
      await produtos.salvar(produto);
      const lido = await produtos.buscarPorId(produto.id);

      expect(lido?.toProps()).toEqual(produto.toProps());
      expect(lido?.status).toBe('INATIVO');
    });

    it('filtra a listagem por status', async () => {
      const inativo = umProdutoAtivo({ nome: 'Metanol', classeDeRisco: '3' });
      inativo.inativar();
      await produtos.salvar(umProdutoAtivo());
      await produtos.salvar(inativo);

      expect(await produtos.listar({ status: 'ATIVO' })).toHaveLength(1);
      expect(await produtos.listar()).toHaveLength(2);
    });
  });

  describe('carga', () => {
    let produtoId: string;

    beforeEach(async () => {
      const produto = umProdutoAtivo();
      await produtos.salvar(produto);
      produtoId = produto.id;
    });

    it('salva a carga com documentos e histórico e lê de volta igual', async () => {
      const carga = umaCargaEm('EM_INSPECAO', produtoId, { documentosApresentados: ['FDS'] });

      await cargas.salvar(carga);
      const lida = await cargas.buscarPorId(carga.id);

      expect(lida).not.toBeNull();
      expect({ ...lida!.toProps(), versao: 0 }).toEqual(carga.toProps());
      expect(lida!.versao).toBe(1);
      expect(lida!.historico.map((h) => h.statusNovo)).toEqual(['REGISTRADA', 'EM_ANALISE', 'EM_INSPECAO']);
    });

    it('grava mudança de status, documentos e novas linhas de histórico', async () => {
      await cargas.salvar(umaCargaEm('EM_INSPECAO', produtoId, { documentosApresentados: [] }));
      const [carga] = await cargas.listar();

      carga!.registrarDocumento('FDS', true);
      carga!.registrarDocumento('FICHA_DE_EMERGENCIA', true);
      carga!.registrarDocumento('DECLARACAO_DE_MERCADORIA_PERIGOSA', true);
      carga!.liberar();
      await cargas.salvar(carga!);

      const lida = await cargas.buscarPorId(carga!.id);
      expect(lida?.status).toBe('LIBERADA');
      expect(lida?.documentacaoCompleta).toBe(true);
      expect(lida?.historico).toHaveLength(4);
      expect(lida?.versao).toBe(2);
    });

    it('busca por código e filtra por status e produto', async () => {
      await cargas.salvar(umaCargaEm('REGISTRADA', produtoId, { codigo: 'CQ-1' }));
      await cargas.salvar(umaCargaEm('EM_ANALISE', produtoId, { codigo: 'CQ-2' }));

      expect((await cargas.buscarPorCodigo('cq-1'))?.codigo).toBe('CQ-1');
      expect(await cargas.listar({ status: 'EM_ANALISE' })).toHaveLength(1);
      expect(await cargas.listar({ produtoId })).toHaveLength(2);
    });

    it('rejeita código duplicado pela restrição UNIQUE do banco', async () => {
      await cargas.salvar(umaCargaEm('REGISTRADA', produtoId, { codigo: 'CQ-1' }));

      await expect(
        cargas.salvar(umaCargaEm('REGISTRADA', produtoId, { codigo: 'CQ-1' })),
      ).rejects.toBeInstanceOf(ConflitoError);
    });

    it('rejeita gravação de versão desatualizada sem alterar o banco', async () => {
      const original = umaCargaEm('REGISTRADA', produtoId);
      await cargas.salvar(original);
      const primeira = await cargas.buscarPorId(original.id);
      const segunda = await cargas.buscarPorId(original.id);
      primeira!.alterarStatus('EM_ANALISE');
      segunda!.cancelar('Desistência do importador');

      await cargas.salvar(primeira!);

      await expect(cargas.salvar(segunda!)).rejects.toBeInstanceOf(ConflitoError);
      const lida = await cargas.buscarPorId(original.id);
      expect(lida?.status).toBe('EM_ANALISE');
      expect(lida?.historico).toHaveLength(2);
    });

    it('a chave estrangeira impede carga de produto inexistente', async () => {
      const carga = umaCargaEm('REGISTRADA', '00000000-0000-0000-0000-000000000000');

      await expect(cargas.salvar(carga)).rejects.toThrow();
    });
  });
});