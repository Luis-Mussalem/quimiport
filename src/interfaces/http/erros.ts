import { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import {
  ApplicationError,
  ConflitoError,
  NaoEncontradoError,
} from '../../application/shared/ApplicationError';
import {
  DomainError,
  RegraDeNegocioError,
  TransicaoDeStatusInvalidaError,
  ValidacaoError,
} from '../../domain/shared/DomainError';
import { Result } from '../../domain/shared/Result';

export interface RespostaDeErro {
  erro: string;
  mensagem: string;
  detalhes?: { campo: string; mensagem: string }[];
}

// Tabela única de tradução: tipo de erro -> código HTTP.
function statusHttp(erro: DomainError | ApplicationError): number {
  if (erro instanceof ValidacaoError) return 400;
  if (erro instanceof NaoEncontradoError) return 404;
  if (erro instanceof ConflitoError) return 409;
  if (erro instanceof TransicaoDeStatusInvalidaError) return 409;
  if (erro instanceof RegraDeNegocioError) return 422;
  return 422;
}

// Os casos de uso devolvem Result; na borda HTTP a falha vira exceção
// e é tratada num único lugar (o error handler abaixo).
export function valorOuErro<T>(resultado: Result<T, Error>): T {
  if (!resultado.ok) throw resultado.error;
  return resultado.value;
}

export function registrarTratamentoDeErros(app: FastifyInstance): void {
  app.setErrorHandler<Error>((erro, request, reply) => {
    if (erro instanceof ZodError) {
      const detalhes = erro.issues.map((issue) => ({
        campo: issue.path.join('.') || '(corpo)',
        mensagem: issue.message,
      }));
      request.log.warn({ evento: 'requisicao.validacao_falhou', detalhes }, 'Dados de entrada inválidos');
      return reply
        .status(400)
        .send({ erro: 'VALIDACAO', mensagem: 'Dados de entrada inválidos', detalhes } satisfies RespostaDeErro);
    }

    if (erro instanceof DomainError || erro instanceof ApplicationError) {
      const status = statusHttp(erro);
      request.log.warn(
        { evento: 'requisicao.rejeitada', codigo: erro.codigo, status, mensagem: erro.message },
        'Requisição rejeitada por regra de negócio',
      );
      return reply.status(status).send({ erro: erro.codigo, mensagem: erro.message } satisfies RespostaDeErro);
    }

    // Erros do próprio Fastify com status 4xx (ex.: JSON malformado).
    const statusDoFastify = (erro as FastifyError).statusCode;
    if (statusDoFastify && statusDoFastify >= 400 && statusDoFastify < 500) {
      request.log.warn({ evento: 'requisicao.invalida', mensagem: erro.message }, 'Requisição inválida');
      return reply
        .status(statusDoFastify)
        .send({ erro: 'REQUISICAO_INVALIDA', mensagem: erro.message } satisfies RespostaDeErro);
    }

    // Erro inesperado: registra tudo no log, mas não expõe detalhes internos.
    request.log.error({ evento: 'erro_interno', err: erro }, 'Erro interno inesperado');
    return reply.status(500).send({
      erro: 'ERRO_INTERNO',
      mensagem: 'Ocorreu um erro interno. Tente novamente mais tarde.',
    } satisfies RespostaDeErro);
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      erro: 'ROTA_NAO_ENCONTRADA',
      mensagem: `A rota ${request.method} ${request.url} não existe`,
    } satisfies RespostaDeErro);
  });
}