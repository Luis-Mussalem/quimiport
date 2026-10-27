import { describe, expect, it } from 'vitest';
import {
  isStatusTerminal,
  podeTransicionar,
  STATUS_DA_CARGA,
  StatusDaCarga,
  TRANSICOES_PERMITIDAS,
} from '../../../src/domain/carga/StatusDaCarga';

const permitidas: [StatusDaCarga, StatusDaCarga][] = [
  ['REGISTRADA', 'EM_ANALISE'],
  ['REGISTRADA', 'CANCELADA'],
  ['EM_ANALISE', 'EM_INSPECAO'],
  ['EM_ANALISE', 'CANCELADA'],
  ['EM_INSPECAO', 'LIBERADA'],
  ['EM_INSPECAO', 'BLOQUEADA'],
  ['EM_INSPECAO', 'CANCELADA'],
  ['LIBERADA', 'EM_MOVIMENTACAO'],
  ['LIBERADA', 'CANCELADA'],
  ['BLOQUEADA', 'CANCELADA'],
  ['EM_MOVIMENTACAO', 'FINALIZADA'],
];

// Todas as combinações possíveis que não estão na lista acima.
const proibidas = STATUS_DA_CARGA.flatMap((de) =>
  STATUS_DA_CARGA.filter((para) => !permitidas.some(([a, b]) => a === de && b === para)).map(
    (para) => [de, para] as [StatusDaCarga, StatusDaCarga],
  ),
);

describe('Máquina de status da carga', () => {
  it('a tabela de transições contém exatamente as transições do enunciado', () => {
    const daTabela = Object.entries(TRANSICOES_PERMITIDAS).flatMap(([de, destinos]) =>
      destinos.map((para) => [de, para]),
    );

    expect(daTabela).toHaveLength(permitidas.length);
  });

  it.each(permitidas)('permite %s -> %s', (de, para) => {
    expect(podeTransicionar(de, para)).toBe(true);
  });

  it.each(proibidas)('proíbe %s -> %s', (de, para) => {
    expect(podeTransicionar(de, para)).toBe(false);
  });

  it('FINALIZADA e CANCELADA são terminais', () => {
    expect(isStatusTerminal('FINALIZADA')).toBe(true);
    expect(isStatusTerminal('CANCELADA')).toBe(true);
    expect(isStatusTerminal('BLOQUEADA')).toBe(false);
  });
});
