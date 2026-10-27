export abstract class DomainError extends Error {
  abstract readonly codigo: string;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

// Dado de entrada inválido para o domínio (campo vazio, valor fora do permitido).
export class ValidacaoError extends DomainError {
  readonly codigo = 'VALIDACAO';
}

// Operação válida em formato, mas proibida por uma regra de negócio.
export class RegraDeNegocioError extends DomainError {
  readonly codigo = 'REGRA_DE_NEGOCIO';
}

export class TransicaoDeStatusInvalidaError extends DomainError {
  readonly codigo = 'TRANSICAO_DE_STATUS_INVALIDA';
}
