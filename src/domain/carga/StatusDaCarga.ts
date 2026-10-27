export const STATUS_DA_CARGA = [
  'REGISTRADA',
  'EM_ANALISE',
  'EM_INSPECAO',
  'LIBERADA',
  'BLOQUEADA',
  'EM_MOVIMENTACAO',
  'FINALIZADA',
  'CANCELADA',
] as const;

export type StatusDaCarga = (typeof STATUS_DA_CARGA)[number];

export function isStatusDaCarga(valor: unknown): valor is StatusDaCarga {
  return typeof valor === 'string' && (STATUS_DA_CARGA as readonly string[]).includes(valor);
}

// Máquina de status: o que não está nesta tabela é proibido.
export const TRANSICOES_PERMITIDAS: Readonly<Record<StatusDaCarga, readonly StatusDaCarga[]>> = {
  REGISTRADA: ['EM_ANALISE', 'CANCELADA'],
  EM_ANALISE: ['EM_INSPECAO', 'CANCELADA'],
  EM_INSPECAO: ['LIBERADA', 'BLOQUEADA', 'CANCELADA'],
  LIBERADA: ['EM_MOVIMENTACAO', 'CANCELADA'],
  BLOQUEADA: ['CANCELADA'],
  EM_MOVIMENTACAO: ['FINALIZADA'],
  FINALIZADA: [],
  CANCELADA: [],
};

export function podeTransicionar(de: StatusDaCarga, para: StatusDaCarga): boolean {
  return TRANSICOES_PERMITIDAS[de].includes(para);
}

export function isStatusTerminal(status: StatusDaCarga): boolean {
  return TRANSICOES_PERMITIDAS[status].length === 0;
}
