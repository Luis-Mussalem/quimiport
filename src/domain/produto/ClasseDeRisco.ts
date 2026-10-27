// Classes e subclasses de risco da ONU (Orange Book / ANTT).
export const CLASSES_DE_RISCO = [
  '1.1', '1.2', '1.3', '1.4', '1.5', '1.6',
  '2.1', '2.2', '2.3',
  '3',
  '4.1', '4.2', '4.3',
  '5.1', '5.2',
  '6.1', '6.2',
  '7',
  '8',
  '9',
] as const;

export type ClasseDeRisco = (typeof CLASSES_DE_RISCO)[number];

export function isClasseDeRisco(valor: unknown): valor is ClasseDeRisco {
  return typeof valor === 'string' && (CLASSES_DE_RISCO as readonly string[]).includes(valor);
}

export const STATUS_DO_PRODUTO = ['ATIVO', 'INATIVO'] as const;

export type StatusDoProduto = (typeof STATUS_DO_PRODUTO)[number];
