import { CargaQuimica } from './CargaQuimica';
import { StatusDaCarga } from './StatusDaCarga';

export interface FiltroDeCargas {
  status?: StatusDaCarga;
  produtoId?: string;
}

export interface CargaQuimicaRepository {
  salvar(carga: CargaQuimica): Promise<void>;
  buscarPorId(id: string): Promise<CargaQuimica | null>;
  buscarPorCodigo(codigo: string): Promise<CargaQuimica | null>;
  listar(filtro?: FiltroDeCargas): Promise<CargaQuimica[]>;
}
