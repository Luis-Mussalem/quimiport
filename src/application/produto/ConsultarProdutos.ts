import { ProdutoQuimicoRepository } from '../../domain/produto/ProdutoQuimicoRepository';
import { StatusDoProduto } from '../../domain/produto/StatusDoProduto';
import { fail, ok, Result } from '../../domain/shared/Result';
import { NaoEncontradoError } from '../shared/ApplicationError';
import { paraProdutoDTO, ProdutoDTO } from './ProdutoDTO';

export class ListarProdutos {
  constructor(private readonly produtos: ProdutoQuimicoRepository) {}

  async executar(filtro: { status?: StatusDoProduto } = {}): Promise<ProdutoDTO[]> {
    const produtos = await this.produtos.listar(filtro);
    return produtos.map(paraProdutoDTO);
  }
}

export class BuscarProduto {
  constructor(private readonly produtos: ProdutoQuimicoRepository) {}

  async executar(id: string): Promise<Result<ProdutoDTO, NaoEncontradoError>> {
    const produto = await this.produtos.buscarPorId(id);
    if (!produto) return fail(new NaoEncontradoError(`Produto ${id} não encontrado`));
    return ok(paraProdutoDTO(produto));
  }
}
