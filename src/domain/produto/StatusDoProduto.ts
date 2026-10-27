export const STATUS_DO_PRODUTO = ['ATIVO', 'INATIVO'] as const;

export type StatusDoProduto = (typeof STATUS_DO_PRODUTO)[number];

export function isStatusDoProduto(valor: unknown): valor is StatusDoProduto {
  return typeof valor === 'string' && (STATUS_DO_PRODUTO as readonly string[]).includes(valor);
}
