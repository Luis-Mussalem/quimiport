import { DomainError } from '../../domain/shared/DomainError';

// Erros que só fazem sentido na orquestração (consultar repositório etc.),
// por isso ficam fora do domínio.
export abstract class ApplicationError extends Error {
  abstract readonly codigo: string;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

export class NaoEncontradoError extends ApplicationError {
  readonly codigo = 'NAO_ENCONTRADO';
}

export class ConflitoError extends ApplicationError {
  readonly codigo = 'CONFLITO';
}

export type ErroDeCasoDeUso = DomainError | ApplicationError;
