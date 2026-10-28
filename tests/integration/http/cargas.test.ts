import { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from '../../support/app';
import { dadosDeProduto } from '../../support/builders';

const TODOS_OS_DOCUMENTOS = ['FDS', 'FICHA_DE_EMERGENCIA', 'DECLARACAO_DE_MERCADORIA_PERIGOSA'];

describe('API de cargas químicas', () => {
  let app: FastifyInstance;
  let produtoId: string;

  const novaCarga = (dados: Record<string, unknown> = {}) => ({
    codigo: 'CQ-2026-0001',
    produtoId,
    quantidade: 1200,
    unidadeDeMedida: 'KG',
    origem: 'Navio MSC Aurora',
    destino: 'Terminal Alemoa',
    responsavelTecnico: 'Eng. Maria Souza',
    documentosApresentados: TODOS_OS_DOCUMENTOS,
    ...dados,
  });

  const registrar = (dados: Record<string, unknown> = {}) =>
    app.inject({ method: 'POST', url: '/cargas-quimicas', payload: novaCarga(dados) });

  const patch = (id: string, acao: string, payload?: object) =>
    app.inject({ method: 'PATCH', url: `/cargas-quimicas/${id}/${acao}`, payload });

  // Registra uma carga e a leva até EM_INSPECAO pelos endpoints.
  const cargaEmInspecao = async (dados: Record<string, unknown> = {}) => {
    const { id } = (await registrar(dados)).json();
    await patch(id, 'status', { status: 'EM_ANALISE' });
    await patch(id, 'status', { status: 'EM_INSPECAO' });
    return id as string;
  };

  beforeEach(async () => {
    app = await criarAppDeTeste();
    const produto = await app.inject({ method: 'POST', url: '/produtos-quimicos', payload: dadosDeProduto() });
    produtoId = produto.json().id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /cargas-quimicas', () => {
    it('registra a carga e responde 201', async () => {
      const resposta = await registrar();

      expect(resposta.statusCode).toBe(201);
      expect(resposta.json()).toMatchObject({
        codigo: 'CQ-2026-0001',
        status: 'REGISTRADA',
        documentacao: { completa: true },
      });
    });

    it('responde 422 para carga com produto inativo', async () => {
      await app.inject({ method: 'PATCH', url: `/produtos-quimicos/${produtoId}/inativar` });

      const resposta = await registrar();

      expect(resposta.statusCode).toBe(422);
      expect(resposta.json().mensagem).toMatch(/inativo/);
    });

    it.each([0, -5])('responde 400 para quantidade %s', async (quantidade) => {
      const resposta = await registrar({ quantidade });

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().detalhes[0]).toEqual({
        campo: 'quantidade',
        mensagem: 'A quantidade deve ser maior que zero',
      });
    });

    it('responde 400 para carga sem responsável técnico', async () => {
      const resposta = await registrar({ responsavelTecnico: '' });

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().detalhes[0].campo).toBe('responsavelTecnico');
    });

    it('responde 409 para código duplicado', async () => {
      await registrar();

      const resposta = await registrar();

      expect(resposta.statusCode).toBe(409);
    });
  });

  describe('mudança de status', () => {
    it('percorre o fluxo completo até FINALIZADA', async () => {
      const id = await cargaEmInspecao();

      expect((await patch(id, 'liberar')).statusCode).toBe(200);
      expect((await patch(id, 'status', { status: 'EM_MOVIMENTACAO' })).statusCode).toBe(200);
      const finalizada = await patch(id, 'status', { status: 'FINALIZADA' });

      expect(finalizada.statusCode).toBe(200);
      expect(finalizada.json().historico.map((h: { statusNovo: string }) => h.statusNovo)).toEqual([
        'REGISTRADA',
        'EM_ANALISE',
        'EM_INSPECAO',
        'LIBERADA',
        'EM_MOVIMENTACAO',
        'FINALIZADA',
      ]);
    });

    it('responde 409 para transição proibida', async () => {
      const { id } = (await registrar()).json();

      const resposta = await patch(id, 'liberar');

      expect(resposta.statusCode).toBe(409);
      expect(resposta.json().erro).toBe('TRANSICAO_DE_STATUS_INVALIDA');
    });

    it('responde 400 para status desconhecido', async () => {
      const { id } = (await registrar()).json();

      const resposta = await patch(id, 'status', { status: 'PERDIDA' });

      expect(resposta.statusCode).toBe(400);
    });

    it('responde 404 para carga inexistente', async () => {
      const resposta = await patch('00000000-0000-4000-8000-000000000000', 'status', { status: 'EM_ANALISE' });

      expect(resposta.statusCode).toBe(404);
    });
  });

  describe('liberação e documentação', () => {
    it('responde 422 ao liberar sem a documentação obrigatória', async () => {
      const id = await cargaEmInspecao({ documentosApresentados: ['FDS'] });

      const resposta = await patch(id, 'liberar');

      expect(resposta.statusCode).toBe(422);
      expect(resposta.json().mensagem).toMatch(/documentação obrigatória/);
    });

    it('libera depois que os documentos pendentes são apresentados', async () => {
      const id = await cargaEmInspecao({ documentosApresentados: ['FDS'] });

      await patch(id, 'documentos', { tipo: 'FICHA_DE_EMERGENCIA', apresentado: true });
      const documento = await patch(id, 'documentos', {
        tipo: 'DECLARACAO_DE_MERCADORIA_PERIGOSA',
        apresentado: true,
      });
      expect(documento.json().documentacao.completa).toBe(true);

      const resposta = await patch(id, 'liberar');
      expect(resposta.statusCode).toBe(200);
      expect(resposta.json().status).toBe('LIBERADA');
    });
  });

  describe('bloqueio e cancelamento', () => {
    it('exige motivo para bloquear', async () => {
      const id = await cargaEmInspecao();

      const resposta = await patch(id, 'bloquear', {});

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().detalhes[0].campo).toBe('motivo');
    });

    it('não movimenta carga bloqueada', async () => {
      const id = await cargaEmInspecao();
      expect((await patch(id, 'bloquear', { motivo: 'Lacre violado' })).statusCode).toBe(200);

      const resposta = await patch(id, 'status', { status: 'EM_MOVIMENTACAO' });

      expect(resposta.statusCode).toBe(409);
    });

    it('cancela a carga e depois não permite liberar', async () => {
      const { id } = (await registrar()).json();

      const cancelada = await patch(id, 'cancelar', { motivo: 'Desistência do importador' });
      expect(cancelada.statusCode).toBe(200);
      expect(cancelada.json().historico.at(-1).motivo).toBe('Desistência do importador');

      const resposta = await patch(id, 'liberar');
      expect(resposta.statusCode).toBe(409);
    });
  });

  describe('GET /cargas-quimicas', () => {
    it('lista com filtro por status e busca por id', async () => {
      const { id } = (await registrar({ codigo: 'CQ-1' })).json();
      await registrar({ codigo: 'CQ-2' });
      await patch(id, 'status', { status: 'EM_ANALISE' });

      const emAnalise = await app.inject({ method: 'GET', url: '/cargas-quimicas?status=EM_ANALISE' });
      const buscada = await app.inject({ method: 'GET', url: `/cargas-quimicas/${id}` });

      expect(emAnalise.json()).toHaveLength(1);
      expect(buscada.json().codigo).toBe('CQ-1');
    });
  });
});
