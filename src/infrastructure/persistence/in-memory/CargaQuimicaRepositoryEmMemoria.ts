import { CargaQuimica, CargaQuimicaProps } from '../../../domain/carga/CargaQuimica';
import {
  CargaQuimicaRepository,
  FiltroDeCargas,
} from '../../../domain/carga/CargaQuimicaRepository';

export class CargaQuimicaRepositoryEmMemoria implements CargaQuimicaRepository {
  private readonly registros = new Map<string, CargaQuimicaProps>();

  async salvar(carga: CargaQuimica): Promise<void> {
    this.registros.set(carga.id, carga.toProps());
  }

  async buscarPorId(id: string): Promise<CargaQuimica | null> {
    const props = this.registros.get(id);
    return props ? CargaQuimica.restaurar(props) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<CargaQuimica | null> {
    const alvo = codigo.trim().toUpperCase();
    const props = [...this.registros.values()].find((p) => p.codigo === alvo);
    return props ? CargaQuimica.restaurar(props) : null;
  }

  async listar(filtro: FiltroDeCargas = {}): Promise<CargaQuimica[]> {
    return [...this.registros.values()]
      .filter((p) => !filtro.status || p.status === filtro.status)
      .filter((p) => !filtro.produtoId || p.produtoId === filtro.produtoId)
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .map((props) => CargaQuimica.restaurar(props));
  }
}
