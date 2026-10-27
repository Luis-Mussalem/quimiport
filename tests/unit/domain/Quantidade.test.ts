import { describe, expect, it } from 'vitest';
import { Quantidade } from '../../../src/domain/carga/Quantidade';
import { ValidacaoError } from '../../../src/domain/shared/DomainError';

describe('Quantidade', () => {
  it('cria quantidade positiva com unidade válida', () => {
    const resultado = Quantidade.criar(500, 'KG');

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value.valor).toBe(500);
    expect(resultado.value.unidade).toBe('KG');
  });

  it.each([0, -1, -0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita quantidade %s',
    (valor) => {
      const resultado = Quantidade.criar(valor, 'KG');

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ValidacaoError);
    },
  );

  it('rejeita unidade de medida desconhecida', () => {
    expect(Quantidade.criar(10, 'galao').ok).toBe(false);
  });

  it('compara por valor', () => {
    const a = Quantidade.criar(10, 'L');
    const b = Quantidade.criar(10, 'L');
    if (!a.ok || !b.ok) throw new Error('quantidades deveriam ser válidas');

    expect(a.value.equals(b.value)).toBe(true);
  });
});
