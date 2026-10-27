import { ProdutoQuimicoRepository } from '../../domain/produto/ProdutoQuimicoRepository';
import { fail, ok, Result } from '../../domain/shared/Result';
import { ErroDeCasoDeUso, NaoEncontradoError } from '../shared/ApplicationError';
import { Logger } from '../shared/Logger';
import { DadosDoProdutoDTO, paraProdutoDTO, ProdutoDTO } from './ProdutoDTO';

export class AtualizarProduto {
  constructor(
    private readonly produtos: ProdutoQuimicoRepository,
    private readonly logger: Logger,
  ) {}

  async executar(
    id: string,
    dados: DadosDoProdutoDTO,
  ): Promise<Result<ProdutoDTO, ErroDeCasoDeUso>> {
    const produto = await this.produtos.buscarPorId(id);
    if (!produto) return fail(new NaoEncontradoError(`Produto ${id} não encontrado`));

    const resultado = produto.atualizar(dados);
    if (!resultado.ok) return resultado;

    await this.produtos.salvar(produto);
    this.logger.info('produto.atualizado', { produtoId: produto.id });
    return ok(paraProdutoDTO(produto));
  }
}
