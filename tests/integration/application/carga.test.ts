import { beforeEach, describe, expect, it } from 'vitest';
import { AlterarStatusDaCarga } from '../../../src/application/carga/AlterarStatusDaCarga';
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
import { dadosDeCarga, loggerFalso, umaCargaEm, umProdutoAtivo, umProdutoInativo } from '../../support/builders';

describe('Casos de uso de carga', () => {
  let cargas: CargaQuimicaRepositoryEmMemoria;
  let produtos: ProdutoQuimicoRepositoryEmMemoria;
  let produto: ProdutoQuimico;
  let logger: ReturnType<typeof loggerFalso>;

  const registrarCarga = () => new RegistrarCarga(cargas, produtos, logger);
  const alterarStatus = (cargaId: string, novoStatus: StatusDaCarga, motivo?: string) =>
    new AlterarStatusDaCarga(cargas, logger).executar({ cargaId, novoStatus, motivo });

  // Cria a carga direto no status desejado e salva no repositório.
  const cargaSalvaEm = async (status: StatusDaCarga, dados = {}) => {
    const carga = umaCargaEm(status, produto.id, dados);
    await cargas.salvar(carga);
    return carga;
  };

  beforeEach(async () => {
    cargas = new CargaQuimicaRepositoryEmMemoria();
    produtos = new ProdutoQuimicoRepositoryEmMemoria();
    logger = loggerFalso();
    produto = umProdutoAtivo();
    await produtos.salvar(produto);
  });

  describe('registro', () => {
    it('registra carga com produto ativo e loga o evento', async () => {
      const resultado = await registrarCarga().executar(dadosDeCarga(produto.id));

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      expect(resultado.value.status).toBe('REGISTRADA');
      expect(resultado.value.documentacao.completa).toBe(true);
      expect(await cargas.buscarPorId(resultado.value.id)).not.toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        'carga.registrada',
        expect.objectContaining({ cargaId: resultado.value.id }),
      );
    });

    it('rejeita carga com produto inativo', async () => {
      const inativo = umProdutoInativo();
      await produtos.salvar(inativo);

      const resultado = await registrarCarga().executar(dadosDeCarga(inativo.id));

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(RegraDeNegocioError);
      expect(resultado.error.message).toMatch(/inativo/);
      expect(await cargas.listar()).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith('carga.registro_rejeitado', expect.anything());
    });

    it('rejeita carga com produto inexistente', async () => {
      const resultado = await registrarCarga().executar(dadosDeCarga('nao-existe'));

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(RegraDeNegocioError);
    });

    it.each([0, -5])('rejeita carga com quantidade %s', async (quantidade) => {
      const resultado = await registrarCarga().executar(dadosDeCarga(produto.id, { quantidade }));

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ValidacaoError);
    });

    it('rejeita código de carga duplicado', async () => {
      await cargaSalvaEm('REGISTRADA', { codigo: 'CQ-0001' });

      const resultado = await registrarCarga().executar(dadosDeCarga(produto.id, { codigo: 'cq-0001' }));

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ConflitoError);
    });
  });

  describe('mudança de status', () => {
    it('atualiza o status, persiste e loga a transição', async () => {
      const carga = await cargaSalvaEm('REGISTRADA');

      const resultado = await alterarStatus(carga.id, 'EM_ANALISE');

      expect(resultado.ok).toBe(true);
      expect((await cargas.buscarPorId(carga.id))?.status).toBe('EM_ANALISE');
      expect(logger.info).toHaveBeenCalledWith(
        'carga.status_alterado',
        expect.objectContaining({ de: 'REGISTRADA', para: 'EM_ANALISE' }),
      );
    });

    it('rejeita transição proibida sem alterar a carga salva', async () => {
      const carga = await cargaSalvaEm('REGISTRADA');

      const resultado = await alterarStatus(carga.id, 'FINALIZADA');

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(TransicaoDeStatusInvalidaError);
      expect((await cargas.buscarPorId(carga.id))?.status).toBe('REGISTRADA');
      expect(logger.warn).toHaveBeenCalledWith('carga.transicao_rejeitada', expect.anything());
    });

    it('não libera carga sem documentação e libera depois de apresentada', async () => {
      const carga = await cargaSalvaEm('EM_INSPECAO', { documentosApresentados: ['FDS'] });

      const semDocumentos = await alterarStatus(carga.id, 'LIBERADA');
      expect(semDocumentos.ok).toBe(false);
      if (semDocumentos.ok) return;
      expect(semDocumentos.error).toBeInstanceOf(RegraDeNegocioError);

      const documento = new RegistrarDocumentoDaCarga(cargas, logger);
      await documento.executar({ cargaId: carga.id, tipo: 'FICHA_DE_EMERGENCIA', apresentado: true });
      await documento.executar({ cargaId: carga.id, tipo: 'DECLARACAO_DE_MERCADORIA_PERIGOSA', apresentado: true });

      const liberada = await alterarStatus(carga.id, 'LIBERADA');
      expect(liberada.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('carga.liberada', expect.anything());
    });

    it('não movimenta carga bloqueada', async () => {
      const carga = await cargaSalvaEm('BLOQUEADA');

      const resultado = await alterarStatus(carga.id, 'EM_MOVIMENTACAO');

      expect(resultado.ok).toBe(false);
      expect((await cargas.buscarPorId(carga.id))?.status).toBe('BLOQUEADA');
    });

    it('bloqueia carga em inspeção e loga o bloqueio', async () => {
      const carga = await cargaSalvaEm('EM_INSPECAO');

      const resultado = await alterarStatus(carga.id, 'BLOQUEADA', 'Lacre violado');

      expect(resultado.ok).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'carga.bloqueada',
        expect.objectContaining({ motivo: 'Lacre violado' }),
      );
    });

    it('cancela a carga registrando o motivo no histórico', async () => {
      const carga = await cargaSalvaEm('LIBERADA');

      const resultado = await alterarStatus(carga.id, 'CANCELADA', 'Desistência do importador');

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      expect(resultado.value.status).toBe('CANCELADA');
      expect(resultado.value.historico.at(-1)?.motivo).toBe('Desistência do importador');
    });

    it('retorna não encontrado para carga inexistente', async () => {
      const resultado = await alterarStatus('nao-existe', 'EM_ANALISE');

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(NaoEncontradoError);
    });
  });

  describe('consultas', () => {
    it('lista cargas filtrando por status e busca por id', async () => {
      const emAnalise = await cargaSalvaEm('EM_ANALISE', { codigo: 'CQ-1' });
      await cargaSalvaEm('REGISTRADA', { codigo: 'CQ-2' });

      const listar = new ListarCargas(cargas);
      expect(await listar.executar()).toHaveLength(2);
      expect(await listar.executar({ status: 'EM_ANALISE' })).toHaveLength(1);

      const buscada = await new BuscarCarga(cargas).executar(emAnalise.id);
      expect(buscada.ok && buscada.value.codigo).toBe('CQ-1');
    });
  });
});
