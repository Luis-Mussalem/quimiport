import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { CasosDeUso } from '../../../application/CasosDeUso';
import { valorOuErro } from '../erros';
import { documentar } from '../openapi';
import { erroResposta, idParams } from '../schemas/comum';
import { dadosDoProdutoBody, filtroDeProdutosQuery, produtoResposta } from '../schemas/produto';

const tags = ['Produtos químicos'];

// Controller: traduz HTTP <-> caso de uso. Não contém regra de negócio.
export function rotasDeProdutos(casos: CasosDeUso): FastifyPluginAsync {
  return async (app) => {
    app.post(
      '/produtos-quimicos',
      {
        schema: documentar({
          tags,
          summary: 'Cadastra um produto químico',
          description: 'Nome e classe de risco são obrigatórios. O produto é criado com status ATIVO.',
          body: dadosDoProdutoBody,
          respostas: {
            201: { descricao: 'Produto cadastrado', schema: produtoResposta },
            400: { descricao: 'Dados inválidos (ex.: sem nome ou sem classe de risco)', schema: erroResposta },
          },
        }),
      },
      async (request, reply) => {
        const dados = dadosDoProdutoBody.parse(request.body);
        const produto = valorOuErro(await casos.cadastrarProduto.executar(dados));
        return reply.status(201).send(produto);
      },
    );

    app.get(
      '/produtos-quimicos',
      {
        schema: documentar({
          tags,
          summary: 'Lista os produtos químicos',
          querystring: filtroDeProdutosQuery,
          respostas: {
            200: { descricao: 'Lista de produtos', schema: z.array(produtoResposta) },
            400: { descricao: 'Filtro inválido', schema: erroResposta },
          },
        }),
      },
      async (request) => {
        const filtro = filtroDeProdutosQuery.parse(request.query);
        return casos.listarProdutos.executar(filtro);
      },
    );

    app.get(
      '/produtos-quimicos/:id',
      {
        schema: documentar({
          tags,
          summary: 'Busca um produto químico pelo id',
          params: idParams,
          respostas: {
            200: { descricao: 'Produto encontrado', schema: produtoResposta },
            400: { descricao: 'Id inválido', schema: erroResposta },
            404: { descricao: 'Produto não encontrado', schema: erroResposta },
          },
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        return valorOuErro(await casos.buscarProduto.executar(id));
      },
    );

    app.put(
      '/produtos-quimicos/:id',
      {
        schema: documentar({
          tags,
          summary: 'Atualiza os dados de um produto químico',
          description: 'Substitui os dados do produto. As mesmas validações do cadastro se aplicam.',
          params: idParams,
          body: dadosDoProdutoBody,
          respostas: {
            200: { descricao: 'Produto atualizado', schema: produtoResposta },
            400: { descricao: 'Dados inválidos', schema: erroResposta },
            404: { descricao: 'Produto não encontrado', schema: erroResposta },
          },
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        const dados = dadosDoProdutoBody.parse(request.body);
        return valorOuErro(await casos.atualizarProduto.executar(id, dados));
      },
    );

    app.patch(
      '/produtos-quimicos/:id/inativar',
      {
        schema: documentar({
          tags,
          summary: 'Inativa um produto químico',
          description:
            'Inativação lógica: o produto não é apagado, mas não pode mais ser usado em novas cargas.',
          params: idParams,
          respostas: {
            200: { descricao: 'Produto inativado', schema: produtoResposta },
            400: { descricao: 'Id inválido', schema: erroResposta },
            404: { descricao: 'Produto não encontrado', schema: erroResposta },
          },
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        return valorOuErro(await casos.inativarProduto.executar(id));
      },
    );
  };
}
