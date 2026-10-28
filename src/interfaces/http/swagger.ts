import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

// Gera o documento OpenAPI a partir dos schemas das rotas e publica a
// interface do Swagger em /docs (JSON em /docs/json).
// Precisa ser registrado antes das rotas para enxergá-las.
export async function registrarDocumentacao(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'QuimiPort API',
        version: '0.2.0',
        description:
          'API de gestão de cargas químicas portuárias. ' +
          'Erros seguem o formato { erro, mensagem, detalhes? }: ' +
          '400 dados inválidos · 404 não encontrado · 409 conflito ou transição de status proibida · ' +
          '422 regra de negócio violada · 500 erro interno (sem detalhes expostos).',
      },
      tags: [
        { name: 'Produtos químicos', description: 'Cadastro e inativação de produtos' },
        { name: 'Cargas químicas', description: 'Registro, documentação e ciclo de status das cargas' },
        { name: 'Saúde', description: 'Disponibilidade da API' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
}
