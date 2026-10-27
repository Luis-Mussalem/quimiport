import { ProdutoQuimico } from './ProdutoQuimico';
import { StatusDoProduto } from './StatusDoProduto';

export interface FiltroDeProdutos {
  status?: StatusDoProduto;
}

// Port: o domínio define o contrato e a infraestrutura implementa (ADR-006).
export interface ProdutoQuimicoRepository {
  salvar(produto: ProdutoQuimico): Promise<void>;
  buscarPorId(id: string): Promise<ProdutoQuimico | null>;
  listar(filtro?: FiltroDeProdutos): Promise<ProdutoQuimico[]>;
}
