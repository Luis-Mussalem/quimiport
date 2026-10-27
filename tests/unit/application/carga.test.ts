import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlterarStatusDaCarga } from '../../../src/application/carga/AlterarStatusDaCarga';
import { RegistrarCargaDTO } from '../../../src/application/carga/CargaDTO';
import { BuscarCarga, ListarCargas } from '../../../src/application/carga/ConsultarCargas';
import { RegistrarCarga } from '../../../src/application/carga/RegistrarCarga';
import { RegistrarDocumentoDaCarga } from '../../../src/application/carga/RegistrarDocumentoDaCarga';
import { ConflitoError, NaoEncontradoError } from '../../../src/application/shared/ApplicationError';
import { StatusDaCarga } from '../../../src/domain/carga/StatusDaCarga';
import { ProdutoQuimico } from '../../../src/domain/produto/ProdutoQuimico';
import {
  RegraDeNegocioError,
  TransicaoDeStatusInvalidaError,
  ValidacaoError,
} from '../../../src/domain/shared/DomainError';
import { CargaQuimicaRepositoryEmMemoria } from '../../../src/infrastructure/persistence/in-memory/CargaQuimicaRepositoryEmMemoria';
import { ProdutoQuimicoRepositoryEmMemoria } from '../../../src/infrastructure/persistence/in-memory/ProdutoQuimicoRepositoryEmMemoria';

describe('Casos de uso de carga', () => {
  let cargas: CargaQuimicaRepositoryEmMemoria;
  let produtos: ProdutoQuimicoRepositoryEmMemoria;
  let produto: ProdutoQuimico;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  const novaCarga = (dados: Partial<RegistrarCargaDTO> = {}): RegistrarCargaDTO => ({
    codigo: 'CQ-0001',
    produtoId: produto.id,
    quantidade: 20,
    unidadeDeMedida: 'T',
    origem: 'Navio MSC Aurora',
    destino: 'Terminal Alemoa',
    responsavelTecnico: 'Eng. Carlos Lima',
    documentosApresentados: ['FDS', 'FICHA_DE_EMERGENCIA', 'DECLARACAO_DE_MERCADORIA_PERIGOSA'],
    ...dados,
  });

  const registrar = async (dados: Partial<RegistrarCargaDTO> = {}) => {
    const resultado = await new RegistrarCarga(cargas, produtos, logger).executar(novaCarga(dados));
    if (!resultado.ok) throw resultado.error;
    return resultado.value;
  };

  const alterar = (cargaId: string, novoStatus: StatusDaCarga, motivo?: string) =>
    new AlterarStatusDaCarga(cargas, logger).executar({ cargaId, novoStatus, motivo });

  beforeEach(async () => {
    cargas = new CargaQuimicaRepositoryEmMemoria();
    produtos = new ProdutoQuimicoRepositoryEmMemoria();
    const criado = ProdutoQuimico.criar({ nome: 'Hidróxido de Sódio', classeDeRisco: '8' });
    if (!criado.ok) throw criado.error;
    produto = criado.value;
    await produtos.salvar(produto);
    vi.clearAllMocks();
  });

  describe('registro', () => {
    it('registra carga com produto ativo e loga o evento', async () => {
      const carga = await registrar();

      expect(carga.status).toBe('REGISTRADA');
      expect(carga.documentacao.completa).toBe(true);
      expect(await cargas.buscarPorId(carga.id)).not.toBeNull();
      expect(logger.info).toHaveBeenCalledWith('carga.registrada', expect.objectContaining({ cargaId: carga.id }));
    });

    it('rejeita carga com produto inativo', async () => {
      produto.inativar();
      await produtos.salvar(produto);

      const resultado = await new RegistrarCarga(cargas, produtos, logger).executar(novaCarga());

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(RegraDeNegocioError);
      expect(resultado.error.message).toMatch(/inativo/);
      expect(await cargas.listar()).toHaveLength(0);
    });

    it('rejeita carga com produto inexistente', async () => {
      const resultado = await new RegistrarCarga(cargas, produtos, logger).executar(
        novaCarga({ produtoId: 'nao-existe' }),
      );

      expect(resultado.ok).toBe(false);
    });

    it.each([0, -5])('rejeita carga com quantidade %s', async (quantidade) => {
      const resultado = await new RegistrarCarga(cargas, produtos, logger).executar(novaCarga({ quantidade }));

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ValidacaoError);
    });

    it('rejeita código de carga duplicado', async () => {
      await registrar();

      const resultado = await new RegistrarCarga(cargas, produtos, logger).executar(novaCarga());

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ConflitoError);
    });
  });

  describe('mudança de status', () => {
    it('atualiza o status, persiste e loga a transição', async () => {
      const carga = await registrar();

      const resultado = await alterar(carga.id, 'EM_ANALISE');

      expect(resultado.ok).toBe(true);
      const salva = await cargas.buscarPorId(carga.id);
      expect(salva?.status).toBe('EM_ANALISE');
      expect(logger.info).toHaveBeenCalledWith(
        'carga.status_alterado',
        expect.objectContaining({ de: 'REGISTRADA', para: 'EM_ANALISE' }),
      );
    });

    it('rejeita transição proibida sem alterar a carga salva', async () => {
      const carga = await registrar();

      const resultado = await alterar(carga.id, 'FINALIZADA');

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(TransicaoDeStatusInvalidaError);
      expect((await cargas.buscarPorId(carga.id))?.status).toBe('REGISTRADA');
      expect(logger.warn).toHaveBeenCalledWith('carga.transicao_rejeitada', expect.anything());
    });

    it('não libera carga sem documentação e libera depois de apresentada', async () => {
      const carga = await registrar({ documentosApresentados: ['FDS'] });
      await alterar(carga.id, 'EM_ANALISE');
      await alterar(carga.id, 'EM_INSPECAO');

      const semDocumentos = await alterar(carga.id, 'LIBERADA');
      expect(semDocumentos.ok).toBe(false);

      const documento = new RegistrarDocumentoDaCarga(cargas, logger);
      await documento.executar({ cargaId: carga.id, tipo: 'FICHA_DE_EMERGENCIA', apresentado: true });
      await documento.executar({ cargaId: carga.id, tipo: 'DECLARACAO_DE_MERCADORIA_PERIGOSA', apresentado: true });

      const liberada = await alterar(carga.id, 'LIBERADA');
      expect(liberada.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('carga.liberada', expect.anything());
    });

    it('não movimenta carga bloqueada', async () => {
      const carga = await registrar();
      await alterar(carga.id, 'EM_ANALISE');
      await alterar(carga.id, 'EM_INSPECAO');
      await alterar(carga.id, 'BLOQUEADA', 'Vazamento detectado');

      const resultado = await alterar(carga.id, 'EM_MOVIMENTACAO');

      expect(resultado.ok).toBe(false);
      expect((await cargas.buscarPorId(carga.id))?.status).toBe('BLOQUEADA');
    });

    it('cancela a carga registrando o motivo no histórico', async () => {
      const carga = await registrar();

      const resultado = await alterar(carga.id, 'CANCELADA', 'Desistência do importador');

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      expect(resultado.value.status).toBe('CANCELADA');
      expect(resultado.value.historico.at(-1)?.motivo).toBe('Desistência do importador');
    });

    it('retorna não encontrado para carga inexistente', async () => {
      const resultado = await alterar('nao-existe', 'EM_ANALISE');

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(NaoEncontradoError);
    });
  });

  describe('consultas', () => {
    it('lista cargas filtrando por status e busca por id', async () => {
      const primeira = await registrar({ codigo: 'CQ-1' });
      await registrar({ codigo: 'CQ-2' });
      await alterar(primeira.id, 'EM_ANALISE');

      const listar = new ListarCargas(cargas);
      expect(await listar.executar()).toHaveLength(2);
      expect(await listar.executar({ status: 'EM_ANALISE' })).toHaveLength(1);

      const buscada = await new BuscarCarga(cargas).executar(primeira.id);
      expect(buscada.ok && buscada.value.codigo).toBe('CQ-1');
    });
  });
});
