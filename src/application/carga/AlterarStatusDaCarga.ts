import { CargaQuimicaRepository } from '../../domain/carga/CargaQuimicaRepository';
import { StatusDaCarga } from '../../domain/carga/StatusDaCarga';
import { fail, ok, Result } from '../../domain/shared/Result';
import { ErroDeCasoDeUso, NaoEncontradoError } from '../shared/ApplicationError';
import { Logger } from '../shared/Logger';
import { CargaDTO, paraCargaDTO } from './CargaDTO';

export interface AlterarStatusDTO {
  cargaId: string;
  novoStatus: StatusDaCarga;
  motivo?: string;
}

const EVENTO_POR_STATUS: Partial<Record<StatusDaCarga, string>> = {
  LIBERADA: 'carga.liberada',
  BLOQUEADA: 'carga.bloqueada',
  CANCELADA: 'carga.cancelada',
};

// Usado por todos os endpoints de status (/status, /bloquear, /liberar,
// /cancelar). Todos acabam em CargaQuimica.alterarStatus().
export class AlterarStatusDaCarga {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async executar(dados: AlterarStatusDTO): Promise<Result<CargaDTO, ErroDeCasoDeUso>> {
    const carga = await this.cargas.buscarPorId(dados.cargaId);
    if (!carga) return fail(new NaoEncontradoError(`Carga ${dados.cargaId} não encontrada`));

    const statusAnterior = carga.status;
    const resultado = carga.alterarStatus(dados.novoStatus, dados.motivo);
    if (!resultado.ok) {
      this.logger.warn('carga.transicao_rejeitada', {
        cargaId: carga.id,
        de: statusAnterior,
        para: dados.novoStatus,
        motivo: resultado.error.message,
      });
      return resultado;
    }

    await this.cargas.salvar(carga);
    this.logger.info(EVENTO_POR_STATUS[dados.novoStatus] ?? 'carga.status_alterado', {
      cargaId: carga.id,
      codigo: carga.codigo,
      de: statusAnterior,
      para: carga.status,
      motivo: dados.motivo,
    });
    return ok(paraCargaDTO(carga));
  }
}
