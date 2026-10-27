import { ValidacaoError } from '../shared/DomainError';
import { fail, ok, Result } from '../shared/Result';

export const UNIDADES_DE_MEDIDA = ['KG', 'T', 'L', 'M3'] as const;

export type UnidadeDeMedida = (typeof UNIDADES_DE_MEDIDA)[number];

export function isUnidadeDeMedida(valor: unknown): valor is UnidadeDeMedida {
  return typeof valor === 'string' && (UNIDADES_DE_MEDIDA as readonly string[]).includes(valor);
}

// Objeto de valor: imutável e não existe em estado inválido (RN-11).
export class Quantidade {
  private constructor(
    readonly valor: number,
    readonly unidade: UnidadeDeMedida,
  ) {}

  static criar(valor: number, unidade: string): Result<Quantidade> {
    if (!Number.isFinite(valor) || valor <= 0) {
      return fail(new ValidacaoError('A quantidade deve ser maior que zero'));
    }
    if (!isUnidadeDeMedida(unidade)) {
      return fail(new ValidacaoError(`Unidade de medida inválida: ${unidade}`));
    }
    return ok(new Quantidade(valor, unidade));
  }

  equals(outra: Quantidade): boolean {
    return this.valor === outra.valor && this.unidade === outra.unidade;
  }
}
