import { ProdutoQuimico, ProdutoQuimicoProps } from '../../../domain/produto/ProdutoQuimico';
import {
  FiltroDeProdutos,
  ProdutoQuimicoRepository,
} from '../../../domain/produto/ProdutoQuimicoRepository';

// Usado nos testes e para rodar a API sem banco.
export class ProdutoQuimicoRepositoryEmMemoria implements ProdutoQuimicoRepository {
  private readonly registros = new Map<string, ProdutoQuimicoProps>();

  async salvar(produto: ProdutoQuimico): Promise<void> {
    this.registros.set(produto.id, produto.toProps());
  }

  async buscarPorId(id: string): Promise<ProdutoQuimico | null> {
    const props = this.registros.get(id);
    return props ? ProdutoQuimico.restaurar(props) : null;
  }

  async listar(filtro: FiltroDeProdutos = {}): Promise<ProdutoQuimico[]> {
    return [...this.registros.values()]
      .filter((props) => !filtro.status || props.status === filtro.status)
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .map((props) => ProdutoQuimico.restaurar(props));
  }
}
