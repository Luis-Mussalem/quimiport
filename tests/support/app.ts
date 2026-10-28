import { FastifyInstance } from 'fastify';
import { CasosDeUso, criarCasosDeUso } from '../../src/application/CasosDeUso';
import { CargaQuimicaRepositoryEmMemoria } from '../../src/infrastructure/persistence/in-memory/CargaQuimicaRepositoryEmMemoria';
import { ProdutoQuimicoRepositoryEmMemoria } from '../../src/infrastructure/persistence/in-memory/ProdutoQuimicoRepositoryEmMemoria';
import { criarApp } from '../../src/interfaces/http/app';
import { loggerFalso } from './builders';

// API completa (rotas, validação, erros, casos de uso) com repositórios em
// memória: testa a camada HTTP sem depender do banco.
export async function criarAppDeTeste(casosDeUso?: CasosDeUso): Promise<FastifyInstance> {
  const casos =
    casosDeUso ??
    criarCasosDeUso(
      {
        produtos: new ProdutoQuimicoRepositoryEmMemoria(),
        cargas: new CargaQuimicaRepositoryEmMemoria(),
      },
      loggerFalso(),
    );
  const app = await criarApp({ casosDeUso: casos });
  await app.ready();
  return app;
}
