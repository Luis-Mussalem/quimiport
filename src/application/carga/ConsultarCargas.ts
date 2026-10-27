import { CargaQuimicaRepository, FiltroDeCargas } from '../../domain/carga/CargaQuimicaRepository';
import { fail, ok, Result } from '../../domain/shared/Result';
import { NaoEncontradoError } from '../shared/ApplicationError';
import { CargaDTO, paraCargaDTO } from './CargaDTO';

export class ListarCargas {
  constructor(private readonly cargas: CargaQuimicaRepository) {}

  async executar(filtro: FiltroDeCargas = {}): Promise<CargaDTO[]> {
    const cargas = await this.cargas.listar(filtro);
    return cargas.map(paraCargaDTO);
  }
}

export class BuscarCarga {
  constructor(private readonly cargas: CargaQuimicaRepository) {}

  async executar(id: string): Promise<Result<CargaDTO, NaoEncontradoError>> {
    const carga = await this.cargas.buscarPorId(id);
    if (!carga) return fail(new NaoEncontradoError(`Carga ${id} não encontrada`));
    return ok(paraCargaDTO(carga));
  }
}
