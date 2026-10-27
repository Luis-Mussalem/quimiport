import { StatusDaCarga } from './StatusDaCarga';

// Uma linha do histórico de status da carga (trilha de auditoria).
export interface RegistroDeStatus {
  readonly id: string;
  readonly statusAnterior: StatusDaCarga | null;
  readonly statusNovo: StatusDaCarga;
  readonly motivo: string | null;
  readonly ocorridoEm: Date;
}
