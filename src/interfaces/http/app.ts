import { randomUUID } from 'node:crypto';
import Fastify, { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { CasosDeUso } from '../../application/CasosDeUso';

export interface OpcoesDoApp {
  casosDeUso: CasosDeUso;
  logger?: FastifyBaseLogger;
  // Verifica dependências externas (ex.: banco) para o /health.
  verificarSaude?: () => Promise<void>;
}

export async function criarApp({ logger, verificarSaude }: OpcoesDoApp): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
  });

  // Devolve o id da requisição para facilitar encontrar os logs dela.
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.get('/health', async (_request, reply) => {
    try {
      await verificarSaude?.();
      return { status: 'ok' };
    } catch {
      return reply.status(503).send({ status: 'indisponivel' });
    }
  });

  return app;
}