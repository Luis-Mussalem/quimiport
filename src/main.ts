import { PrismaClient } from '@prisma/client';
import { criarCasosDeUso } from './application/CasosDeUso';
import { carregarAmbiente } from './infrastructure/config/env';
import { criarLoggerRaiz, PinoLogger } from './infrastructure/logging/logger';
import { PrismaCargaQuimicaRepository } from './infrastructure/persistence/prisma/PrismaCargaQuimicaRepository';
import { PrismaProdutoQuimicoRepository } from './infrastructure/persistence/prisma/PrismaProdutoQuimicoRepository';
import { criarApp } from './interfaces/http/app';

// Composition root: o único lugar que conhece todas as peças concretas
// e as conecta (banco real, logger real, servidor HTTP).
async function iniciar(): Promise<void> {
  const ambiente = carregarAmbiente();
  const logger = criarLoggerRaiz({
    nivel: ambiente.LOG_LEVEL,
    legivel: ambiente.NODE_ENV === 'development',
  });

  const prisma = new PrismaClient({ datasourceUrl: ambiente.DATABASE_URL });
  const casosDeUso = criarCasosDeUso(
    {
      produtos: new PrismaProdutoQuimicoRepository(prisma),
      cargas: new PrismaCargaQuimicaRepository(prisma),
    },
    new PinoLogger(logger),
  );

  const app = await criarApp({
    casosDeUso,
    logger,
    verificarSaude: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
  });

  const encerrar = async (sinal: string) => {
    app.log.info({ sinal }, 'Encerrando a aplicação');
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);

  await app.listen({ host: ambiente.HOST, port: ambiente.PORT });
}

iniciar().catch((erro) => {
  console.error('Falha ao iniciar a aplicação:', erro);
  process.exit(1);
});