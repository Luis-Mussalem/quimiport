import { CargaQuimicaRepository } from '../../domain/carga/CargaQuimicaRepository';
import { TipoDeDocumento } from '../../domain/carga/DocumentoDaCarga';
import { fail, ok, Result } from '../../domain/shared/Result';
import { ErroDeCasoDeUso, NaoEncontradoError } from '../shared/ApplicationError';
import { Logger } from '../shared/Logger';
import { CargaDTO, paraCargaDTO } from './CargaDTO';

export interface RegistrarDocumentoDTO {
  cargaId: string;
  tipo: TipoDeDocumento;
  apresentado: boolean;
}

export class RegistrarDocumentoDaCarga {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async executar(dados: RegistrarDocumentoDTO): Promise<Result<CargaDTO, ErroDeCasoDeUso>> {
    const carga = await this.cargas.buscarPorId(dados.cargaId);
    if (!carga) return fail(new NaoEncontradoError(`Carga ${dados.cargaId} não encontrada`));

    const resultado = carga.registrarDocumento(dados.tipo, dados.apresentado);
    if (!resultado.ok) return resultado;

    await this.cargas.salvar(carga);
    this.logger.info('carga.documento_atualizado', {
      cargaId: carga.id,
      tipo: dados.tipo,
      apresentado: dados.apresentado,
      documentacaoCompleta: carga.documentacaoCompleta,
    });
    return ok(paraCargaDTO(carga));
  }
}
