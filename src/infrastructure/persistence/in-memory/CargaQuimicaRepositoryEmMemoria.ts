import { ConflitoError } from '../../../application/shared/ApplicationError';
import { CargaQuimica, CargaQuimicaProps } from '../../../domain/carga/CargaQuimica';
import {
  CargaQuimicaRepository,
  FiltroDeCargas,
} from '../../../domain/carga/CargaQuimicaRepository';

export class CargaQuimicaRepositoryEmMemoria implements CargaQuimicaRepository {
  private readonly registros = new Map<string, CargaQuimicaProps>();

  // Mesmo comportamento do repositório real: só grava se a versão lida
  // ainda for a versão salva (controle de concorrência otimista).
  async salvar(carga: CargaQuimica): Promise<void> {
    const props = carga.toProps();
    const versaoSalva = this.registros.get(props.id)?.versao ?? 0;

    if (props.versao !== versaoSalva) {
      throw new ConflitoError(`A carga ${props.codigo} foi alterada por outra operação. Tente novamente.`);
    }
    this.registros.set(props.id, { ...props, versao: versaoSalva + 1 });
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