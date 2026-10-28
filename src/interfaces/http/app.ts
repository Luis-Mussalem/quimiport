import { randomUUID } from 'node:crypto';
import Fastify, { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { CasosDeUso } from '../../application/CasosDeUso';
import { rotasDeCargas } from './controllers/CargaQuimicaController';
import { rotasDeProdutos } from './controllers/ProdutoQuimicoController';
import { registrarTratamentoDeErros } from './erros';
import { registrarDocumentacao } from './swagger';

export interface OpcoesDoApp {
  casosDeUso: CasosDeUso;
  logger?: FastifyBaseLogger;
  // Verifica dependências externas (ex.: banco) para o /health.
  verificarSaude?: () => Promise<void>;
}

export async function criarApp({
  casosDeUso,
  logger,
  verificarSaude,
}: OpcoesDoApp): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
  });

  // A validação é feita com Zod nos controllers. Os schemas JSON das rotas
  // servem só para documentar, então o Fastify não valida nem filtra nada.
  app.setValidatorCompiler(() => (dados) => ({ value: dados }));
  app.setSerializerCompiler(() => (dados) => JSON.stringify(dados));

  registrarTratamentoDeErros(app);
  await registrarDocumentacao(app);

  // Devolve o id da requisição para facilitar encontrar os logs dela.
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.get(
    '/health',
    { schema: { tags: ['Saúde'], summary: 'Verifica se a API e o banco de dados estão disponíveis' } },
    async (_request, reply) => {
      try {
        await verificarSaude?.();
        return { status: 'ok' };
      } catch {
        return reply.status(503).send({ status: 'indisponivel' });
      }
    },
  );

  await app.register(rotasDeProdutos(casosDeUso));
  await app.register(rotasDeCargas(casosDeUso));

  return app;
}
