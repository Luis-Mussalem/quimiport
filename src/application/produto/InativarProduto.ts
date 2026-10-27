import { ProdutoQuimicoRepository } from '../../domain/produto/ProdutoQuimicoRepository';
import { fail, ok, Result } from '../../domain/shared/Result';
import { ErroDeCasoDeUso, NaoEncontradoError } from '../shared/ApplicationError';
import { Logger } from '../shared/Logger';
import { paraProdutoDTO, ProdutoDTO } from './ProdutoDTO';

export class InativarProduto {
  constructor(
    private readonly produtos: ProdutoQuimicoRepository,
    private readonly logger: Logger,
  ) {}

  async executar(id: string): Promise<Result<ProdutoDTO, ErroDeCasoDeUso>> {
    const produto = await this.produtos.buscarPorId(id);
    if (!produto) return fail(new NaoEncontradoError(`Produto ${id} não encontrado`));

    if (produto.estaAtivo) {
      produto.inativar();
      await this.produtos.salvar(produto);
      this.logger.info('produto.inativado', { produtoId: produto.id });
    }
    return ok(paraProdutoDTO(produto));
  }
}
