import { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarCasosDeUso } from '../../../src/application/CasosDeUso';
import { CargaQuimicaRepositoryEmMemoria } from '../../../src/infrastructure/persistence/in-memory/CargaQuimicaRepositoryEmMemoria';
import { ProdutoQuimicoRepositoryEmMemoria } from '../../../src/infrastructure/persistence/in-memory/ProdutoQuimicoRepositoryEmMemoria';
import { criarAppDeTeste } from '../../support/app';
import { dadosDeProduto, loggerFalso } from '../../support/builders';

describe('API de produtos químicos', () => {
  let app: FastifyInstance;

  const cadastrar = (body: unknown) => app.inject({ method: 'POST', url: '/produtos-quimicos', payload: body as object });

  beforeEach(async () => {
    app = await criarAppDeTeste();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /produtos-quimicos', () => {
    it('cadastra um produto e responde 201', async () => {
      const resposta = await cadastrar(dadosDeProduto({ nome: 'Acetona', classeDeRisco: '3' }));

      expect(resposta.statusCode).toBe(201);
      expect(resposta.json()).toMatchObject({ nome: 'Acetona', classeDeRisco: '3', status: 'ATIVO' });
      expect(resposta.headers['x-request-id']).toBeTruthy();
    });

    it('responde 400 para produto sem nome', async () => {
      const { nome: _nome, ...semNome } = dadosDeProduto();

      const resposta = await cadastrar(semNome);

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json()).toMatchObject({
        erro: 'VALIDACAO',
        detalhes: [{ campo: 'nome', mensagem: 'O nome é obrigatório' }],
      });
    });

    it('responde 400 para produto sem classe de risco', async () => {
      const { classeDeRisco: _classe, ...semClasse } = dadosDeProduto();

      const resposta = await cadastrar(semClasse);

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().detalhes[0].campo).toBe('classeDeRisco');
    });

    it('responde 400 quando o domínio recusa o número ONU', async () => {
      const resposta = await cadastrar(dadosDeProduto({ numeroOnu: 'ABC' }));

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().erro).toBe('VALIDACAO');
    });

    it('responde 400 para JSON malformado', async () => {
      const resposta = await app.inject({
        method: 'POST',
        url: '/produtos-quimicos',
        headers: { 'content-type': 'application/json' },
        payload: '{ "nome": ',
      });

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().erro).toBe('REQUISICAO_INVALIDA');
    });
  });

  describe('consultas, atualização e inativação', () => {
    it('busca por id, atualiza, inativa e filtra por status', async () => {
      const { id } = (await cadastrar(dadosDeProduto())).json();
      await cadastrar(dadosDeProduto({ nome: 'Metanol', classeDeRisco: '3' }));

      const buscado = await app.inject({ method: 'GET', url: `/produtos-quimicos/${id}` });
      expect(buscado.statusCode).toBe(200);

      const atualizado = await app.inject({
        method: 'PUT',
        url: `/produtos-quimicos/${id}`,
        payload: dadosDeProduto({ descricao: 'Soda cáustica' }),
      });
      expect(atualizado.statusCode).toBe(200);
      expect(atualizado.json().descricao).toBe('Soda cáustica');

      const inativado = await app.inject({ method: 'PATCH', url: `/produtos-quimicos/${id}/inativar` });
      expect(inativado.statusCode).toBe(200);
      expect(inativado.json().status).toBe('INATIVO');

      const ativos = await app.inject({ method: 'GET', url: '/produtos-quimicos?status=ATIVO' });
      expect(ativos.json()).toHaveLength(1);
    });

    it('responde 404 para produto inexistente', async () => {
      const resposta = await app.inject({
        method: 'GET',
        url: '/produtos-quimicos/00000000-0000-4000-8000-000000000000',
      });

      expect(resposta.statusCode).toBe(404);
      expect(resposta.json().erro).toBe('NAO_ENCONTRADO');
    });

    it('responde 400 para id que não é UUID', async () => {
      const resposta = await app.inject({ method: 'GET', url: '/produtos-quimicos/123' });

      expect(resposta.statusCode).toBe(400);
      expect(resposta.json().detalhes[0].campo).toBe('id');
    });
  });

  describe('infraestrutura HTTP', () => {
    it('responde 404 padronizado para rota inexistente', async () => {
      const resposta = await app.inject({ method: 'GET', url: '/nao-existe' });

      expect(resposta.statusCode).toBe(404);
      expect(resposta.json().erro).toBe('ROTA_NAO_ENCONTRADA');
    });

    it('responde 500 sem expor detalhes internos', async () => {
      const casos = criarCasosDeUso(
        { produtos: new ProdutoQuimicoRepositoryEmMemoria(), cargas: new CargaQuimicaRepositoryEmMemoria() },
        loggerFalso(),
      );
      casos.listarProdutos.executar = async () => {
        throw new Error('conexão com o banco perdida');
      };
      const appComFalha = await criarAppDeTeste(casos);

      const resposta = await appComFalha.inject({ method: 'GET', url: '/produtos-quimicos' });

      expect(resposta.statusCode).toBe(500);
      expect(resposta.json().erro).toBe('ERRO_INTERNO');
      expect(resposta.body).not.toContain('banco');
      await appComFalha.close();
    });

    it('expõe o health check e a documentação OpenAPI', async () => {
      const saude = await app.inject({ method: 'GET', url: '/health' });
      const documentacao = await app.inject({ method: 'GET', url: '/docs/json' });

      expect(saude.json()).toEqual({ status: 'ok' });
      expect(documentacao.statusCode).toBe(200);
      expect(Object.keys(documentacao.json().paths)).toEqual(
        expect.arrayContaining(['/produtos-quimicos', '/cargas-quimicas/{id}/liberar']),
      );
    });
  });
});
