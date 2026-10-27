// Documentos exigidos para liberar qualquer carga perigosa no porto.
// FDS: Ficha com Dados de Segurança (antiga FISPQ).
export const DOCUMENTOS_OBRIGATORIOS = [
  'FDS',
  'FICHA_DE_EMERGENCIA',
  'DECLARACAO_DE_MERCADORIA_PERIGOSA',
] as const;

export type TipoDeDocumento = (typeof DOCUMENTOS_OBRIGATORIOS)[number];

export function isTipoDeDocumento(valor: unknown): valor is TipoDeDocumento {
  return typeof valor === 'string' && (DOCUMENTOS_OBRIGATORIOS as readonly string[]).includes(valor);
}

export interface DocumentoDaCarga {
  readonly tipo: TipoDeDocumento;
  readonly apresentado: boolean;
  readonly apresentadoEm: Date | null;
}
